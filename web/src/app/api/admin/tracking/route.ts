import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q")?.trim().toLowerCase() || "";
        const statusFilter = searchParams.get("status") || "ALL";

        const drivers = await prisma.user.findMany({
            where: {
                role: "DRIVER",
                ...(query ? {
                    OR: [
                        { name: { contains: query } },
                        { phone: { contains: query } },
                        { email: { contains: query } },
                        { driverProfile: { licensePlate: { contains: query } } },
                        { driverProfile: { driverLicense: { contains: query } } },
                        { driverProfile: { imei: { contains: query } } },
                        { driverProfile: { vehicleModel: { contains: query } } },
                    ]
                } : {})
            },
            include: {
                driverProfile: {
                    include: {
                        rides: {
                            where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
                            take: 1,
                            select: { id: true, status: true, originAddress: true, destAddress: true, guestName: true, rider: { select: { name: true } } }
                        },
                        locationLogs: {
                            orderBy: { createdAt: "desc" },
                            take: 10,
                            select: { lat: true, lng: true, speed: true, heading: true, createdAt: true }
                        }
                    }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        const mapped = drivers.map((d) => {
            const profile = d.driverProfile;
            const activeRide = profile?.rides?.[0] || null;
            const isOnline = profile?.isOnline || false;
            const currentStatus = activeRide ? "ON_TRIP" : isOnline ? "ONLINE" : "OFFLINE";

            return {
                id: d.id,
                driverProfileId: profile?.id,
                name: d.name || "Unnamed Driver",
                email: d.email,
                phone: d.phone,
                vehicleModel: profile?.vehicleModel || "Standard Sedan",
                vehicleColor: profile?.vehicleColor || "Standard",
                vehicleType: profile?.vehicleType || "Car",
                licensePlate: profile?.licensePlate || "UNASSIGNED",
                driverLicense: profile?.driverLicense || "N/A",
                imei: profile?.imei || "NOT_BOUND",
                deviceId: profile?.deviceId || "N/A",
                status: currentStatus,
                isOnline,
                rating: profile?.rating || 5.0,
                reviewCount: profile?.reviewCount || 0,
                currentLat: profile?.currentLat || null,
                currentLng: profile?.currentLng || null,
                speed: profile?.speed || 0,
                heading: profile?.heading || 0,
                batteryLevel: profile?.batteryLevel || 100,
                signalStrength: profile?.signalStrength || 100,
                lastPing: profile?.lastPing || d.updatedAt,
                activeRide: activeRide ? {
                    id: activeRide.id,
                    status: activeRide.status,
                    passenger: activeRide.guestName || activeRide.rider?.name || "Passenger",
                    pickup: activeRide.originAddress,
                    destination: activeRide.destAddress
                } : null,
                recentBreadcrumbs: profile?.locationLogs || []
            };
        });

        // Filter by status if requested
        const filtered = statusFilter === "ALL" 
            ? mapped 
            : mapped.filter((item) => item.status === statusFilter);

        return NextResponse.json({
            totalCount: filtered.length,
            onlineCount: mapped.filter((m) => m.status === "ONLINE").length,
            onTripCount: mapped.filter((m) => m.status === "ON_TRIP").length,
            offlineCount: mapped.filter((m) => m.status === "OFFLINE").length,
            drivers: filtered
        });

    } catch (error: any) {
        console.error("Admin tracking API error:", error);
        return NextResponse.json({ error: "Failed to fetch tracking data", details: error.message }, { status: 500 });
    }
}
