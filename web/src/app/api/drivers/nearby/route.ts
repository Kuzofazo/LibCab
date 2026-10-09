import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findNearbyDrivers, getMonroviaSampleDrivers, DriverCoordinate } from "@/lib/geo";
import { memoryCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        
        const latParam = searchParams.get("lat");
        const lngParam = searchParams.get("lng");
        const radiusParam = searchParams.get("radius");
        const vehicleTypeParam = searchParams.get("vehicleType") || "ALL";

        const originLat = latParam ? parseFloat(latParam) : 6.3156;
        const originLng = lngParam ? parseFloat(lngParam) : -10.8074;
        const radiusKm = radiusParam ? Math.min(Math.max(parseFloat(radiusParam), 1), 50) : 10;

        if (isNaN(originLat) || isNaN(originLng)) {
            return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
        }

        const cacheKey = `nearby_drivers_${originLat.toFixed(2)}_${originLng.toFixed(2)}_${radiusKm}_${vehicleTypeParam}`;
        const cached = memoryCache.get<any>(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // 1. Fetch live online drivers from database
        const onlineDrivers = await prisma.driverProfile.findMany({
            where: {
                isOnline: true,
                currentLat: { not: null },
                currentLng: { not: null },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    }
                }
            }
        });

        const activeDrivers: DriverCoordinate[] = onlineDrivers.map((dp) => {
            const shortId = dp.id.slice(-4).toUpperCase();
            return {
                id: dp.id,
                userId: dp.userId,
                driverNumber: `DRV-${shortId}`,
                name: dp.user?.name || `AfriCab Driver #${shortId}`,
                phone: dp.user?.phone || "+231 77 000 0000",
                vehicleType: dp.vehicleType || "Car",
                vehicleModel: dp.vehicleModel || "AfriCab Sedan",
                vehicleColor: dp.vehicleColor || "Silver",
                licensePlate: dp.licensePlate || `LB-${shortId}-A`,
                lat: dp.currentLat!,
                lng: dp.currentLng!,
                rating: dp.rating || 5.0,
                reviewCount: dp.reviewCount || 0,
                isOnline: dp.isOnline,
                speed: dp.speed || 0,
                heading: dp.heading || 0,
            };
        });

        // 2. If fewer than 3 drivers in database (e.g. initial dev/seed), supplement with realistic Monrovia drivers
        let combinedDrivers: DriverCoordinate[] = [...activeDrivers];
        if (combinedDrivers.length < 3) {
            const sampleDrivers = getMonroviaSampleDrivers(originLat, originLng);
            const existingIds = new Set(combinedDrivers.map(d => d.id));
            for (const sample of sampleDrivers) {
                if (!existingIds.has(sample.id)) {
                    combinedDrivers.push(sample);
                }
            }
        }

        // 3. Optional filter by vehicle type if specified
        if (vehicleTypeParam && vehicleTypeParam !== "ALL") {
            const normalizedFilter = vehicleTypeParam.toLowerCase();
            combinedDrivers = combinedDrivers.filter((d) => 
                (d.vehicleType || "car").toLowerCase().includes(normalizedFilter)
            );
        }

        // 4. Calculate distance, ETA, enrich, and sort by proximity (closest first)
        const nearbyDrivers = findNearbyDrivers(originLat, originLng, combinedDrivers, radiusKm);

        const result = {
            success: true,
            origin: { lat: originLat, lng: originLng },
            radiusKm,
            count: nearbyDrivers.length,
            drivers: nearbyDrivers,
            timestamp: new Date().toISOString(),
        };

        memoryCache.set(cacheKey, result, 3);

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error("Nearby drivers discovery API error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to discover nearby drivers", details: message },
            { status: 500 }
        );
    }
}
