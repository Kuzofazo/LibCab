import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER' },
            include: {
                driverProfile: true,
                _count: {
                    select: { ridesAsRider: false } // We need rides as driver, but relations are defined differently
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to a more useful format for the UI
        const mappedDrivers = drivers.map(d => ({
            id: d.id,
            name: d.name,
            email: d.email,
            phone: d.phone,
            status: d.driverProfile?.isOnline ? "ONLINE" : "OFFLINE",
            rating: d.driverProfile?.rating || 5.0,
            vehicle: `${d.driverProfile?.vehicleColor || ""} ${d.driverProfile?.vehicleModel || ""}`.trim() || "N/A",
            licensePlate: d.driverProfile?.licensePlate || "N/A",
            joinedDate: new Date(d.createdAt).toLocaleDateString(),
            // Mocking these for now as we don't have complex trip/earning logic yet
            totalTrips: 0,
            earningsToday: 0
        }));

        return NextResponse.json(mappedDrivers);
    } catch (error) {
        console.error("Fetch drivers error", error);
        return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
    }
}
