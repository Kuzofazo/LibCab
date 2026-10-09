import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryCache } from "@/lib/cache";

const FLEET_DRIVERS_CACHE_KEY = "fleet_drivers_all";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const vehicleType = searchParams.get("vehicleType");
        const status = searchParams.get("status"); // "ALL", "AVAILABLE", "ON_TRIP"
        const query = searchParams.get("q")?.trim().toLowerCase() || "";

        // Only cache completely unfiltered requests (absorbs burst of concurrent polls)
        const isUnfiltered = (!vehicleType || vehicleType === "ALL") && (!status || status === "ALL") && !query;
        if (isUnfiltered) {
            const cached = memoryCache.get<{ stats: any; drivers: any[] }>(FLEET_DRIVERS_CACHE_KEY);
            if (cached) return NextResponse.json(cached);
        }

        // Query ONLY active/online drivers (isOnline === true)
        const onlineDrivers = await prisma.user.findMany({
            where: {
                role: "DRIVER",
                driverProfile: {
                    isOnline: true,
                    ...(vehicleType && vehicleType !== "ALL" ? { vehicleType } : {}),
                    ...(query ? {
                        OR: [
                            { licensePlate: { contains: query } },
                            { vehicleModel: { contains: query } },
                            { vehicleType: { contains: query } },
                            { imei: { contains: query } },
                            { driverLicense: { contains: query } },
                        ]
                    } : {})
                },
                ...(query ? {
                    OR: [
                        { name: { contains: query } },
                        { phone: { contains: query } },
                        { email: { contains: query } }
                    ]
                } : {})
            },
            include: {
                driverProfile: {
                    include: {
                        rides: {
                            where: { status: { in: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] } },
                            take: 1,
                            select: {
                                id: true,
                                status: true,
                                originAddress: true,
                                destAddress: true,
                                guestName: true,
                                guestPhone: true,
                                rider: { select: { name: true, phone: true } },
                                fare: true
                            }
                        },
                        locationLogs: {
                            orderBy: { createdAt: "desc" },
                            take: 5,
                            select: { lat: true, lng: true, speed: true, heading: true, createdAt: true }
                        }
                    }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        const mappedDrivers = onlineDrivers.map((d) => {
            const profile = d.driverProfile;
            const activeRide = profile?.rides?.[0] || null;
            const driverStatus = activeRide ? "ON_TRIP" : "AVAILABLE";

            return {
                id: d.id,
                driverProfileId: profile?.id,
                name: d.name || "Driver",
                email: d.email,
                phone: d.phone || "N/A",
                vehicleModel: profile?.vehicleModel || "Standard Sedan",
                vehicleColor: profile?.vehicleColor || "Yellow/Black",
                vehicleType: profile?.vehicleType || "CAR",
                licensePlate: profile?.licensePlate || "LB-CAB-000",
                driverLicense: profile?.driverLicense || "N/A",
                imei: profile?.imei || `DRV-${d.id.slice(-6).toUpperCase()}`,
                deviceId: profile?.deviceId || "N/A",
                status: driverStatus,
                isOnline: true,
                rating: profile?.rating || 5.0,
                reviewCount: profile?.reviewCount || 0,
                currentLat: profile?.currentLat || 6.3156,
                currentLng: profile?.currentLng || -10.8074,
                speed: profile?.speed || 0,
                heading: profile?.heading || 0,
                batteryLevel: profile?.batteryLevel ?? 100,
                signalStrength: profile?.signalStrength ?? 100,
                lastPing: profile?.lastPing || d.updatedAt,
                activeRide: activeRide ? {
                    id: activeRide.id,
                    status: activeRide.status,
                    passenger: activeRide.guestName || activeRide.rider?.name || "Passenger",
                    passengerPhone: activeRide.guestPhone || activeRide.rider?.phone || "N/A",
                    pickup: activeRide.originAddress,
                    destination: activeRide.destAddress,
                    fare: activeRide.fare
                } : null,
                recentBreadcrumbs: profile?.locationLogs || []
            };
        });

        // Optional status filtering (e.g. AVAILABLE vs ON_TRIP)
        const filtered = (status && status !== "ALL")
            ? mappedDrivers.filter(d => d.status === status)
            : mappedDrivers;

        const stats = {
            totalOnline: mappedDrivers.length,
            available: mappedDrivers.filter(d => d.status === "AVAILABLE").length,
            onTrip: mappedDrivers.filter(d => d.status === "ON_TRIP").length,
            averageSpeed: mappedDrivers.length > 0
                ? (mappedDrivers.reduce((acc, curr) => acc + (curr.speed || 0), 0) / mappedDrivers.length)
                : 0
        };

        const result = { stats, drivers: filtered };
        if (isUnfiltered) {
            memoryCache.set(FLEET_DRIVERS_CACHE_KEY, result, 5); // 5 s TTL — absorbs burst polling
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Fleet drivers API error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: "Failed to fetch active drivers", details: message }, { status: 500 });
    }
}
