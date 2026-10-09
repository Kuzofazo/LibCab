import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rideStreamManager } from "@/lib/sse";
import { memoryCache } from "@/lib/cache";

const FLEET_ASSETS_CACHE_KEY = "fleet_assets_all";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get("orgId");
        const query = searchParams.get("q")?.trim().toLowerCase() || "";
        const assetType = searchParams.get("assetType");
        const status = searchParams.get("status");

        const isUnfiltered = (!orgId || orgId === "ALL") && (!assetType || assetType === "ALL") && (!status || status === "ALL") && !query;
        if (isUnfiltered) {
            const cached = memoryCache.get<{ stats: any; assets: any[] }>(FLEET_ASSETS_CACHE_KEY);
            if (cached) return NextResponse.json(cached);
        }

        const assets = await prisma.fleetAsset.findMany({
            where: {
                ...(orgId && orgId !== "ALL" ? { orgId } : {}),
                ...(assetType && assetType !== "ALL" ? { assetType } : {}),
                ...(status && status !== "ALL" ? { status } : {}),
                ...(query ? {
                    OR: [
                        { name: { contains: query } },
                        { licensePlate: { contains: query } },
                        { imei: { contains: query } },
                        { driverName: { contains: query } },
                        { driverPhone: { contains: query } },
                        { trackerModel: { contains: query } },
                        { geofenceZone: { contains: query } },
                    ]
                } : {})
            },
            include: {
                organization: {
                    select: { id: true, name: true, code: true, category: true }
                },
                locationLogs: {
                    orderBy: { createdAt: "desc" },
                    take: 15,
                    select: { lat: true, lng: true, speed: true, heading: true, createdAt: true }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        const stats = {
            total: assets.length,
            inTransit: assets.filter(a => a.status === "IN_TRANSIT").length,
            active: assets.filter(a => a.status === "ACTIVE").length,
            idle: assets.filter(a => a.status === "IDLE").length,
            maintenance: assets.filter(a => a.status === "MAINTENANCE").length,
            offline: assets.filter(a => a.status === "OFFLINE").length,
        };

        const result = { stats, assets };
        if (isUnfiltered) {
            memoryCache.set(FLEET_ASSETS_CACHE_KEY, result, 10);
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal error";
        console.error("Fleet assets API error:", error);
        return NextResponse.json({ error: "Failed to fetch fleet assets", details: msg }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            orgId,
            name,
            assetType = "CAR",
            licensePlate,
            imei,
            trackerModel = "AfriCab IoT Hardware Tracker",
            driverName,
            driverPhone,
            geofenceZone = "Greater Monrovia Corridor",
            currentLat = 6.3156,
            currentLng = -10.8074
        } = body;

        if (!orgId || !name || !imei) {
            return NextResponse.json({ error: "Organization, Asset Name, and Tracker IMEI are required" }, { status: 400 });
        }

        const existingImei = await prisma.fleetAsset.findUnique({ where: { imei } });
        if (existingImei) {
            return NextResponse.json({ error: "Tracker with this IMEI is already registered" }, { status: 400 });
        }

        const newAsset = await prisma.fleetAsset.create({
            data: {
                orgId,
                name,
                assetType,
                licensePlate,
                imei,
                trackerModel,
                driverName,
                driverPhone,
                geofenceZone,
                currentLat: parseFloat(currentLat) || 6.3156,
                currentLng: parseFloat(currentLng) || -10.8074,
                speed: 0,
                heading: 0,
                batteryLevel: 100,
                signalStrength: 100,
                fuelLevel: 100,
                status: "ACTIVE",
                lastPing: new Date()
            },
            include: {
                organization: { select: { name: true, code: true } }
            }
        });

        // Broadcast real-time creation event
        rideStreamManager.publish({
            type: "RIDE_UPDATED",
            data: { event: "NEW_FLEET_ASSET", asset: newAsset },
            timestamp: new Date().toISOString()
        });

        memoryCache.invalidate(FLEET_ASSETS_CACHE_KEY);

        return NextResponse.json(newAsset, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal error";
        console.error("Create fleet asset error:", error);
        return NextResponse.json({ error: "Failed to register fleet asset", details: msg }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status, driverName, driverPhone, geofenceZone, lat, lng, speed, heading, fuelLevel, batteryLevel } = body;

        if (!id) {
            return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });
        }

        const updated = await prisma.fleetAsset.update({
            where: { id },
            data: {
                ...(status ? { status } : {}),
                ...(driverName ? { driverName } : {}),
                ...(driverPhone ? { driverPhone } : {}),
                ...(geofenceZone ? { geofenceZone } : {}),
                ...(lat !== undefined ? { currentLat: parseFloat(lat) } : {}),
                ...(lng !== undefined ? { currentLng: parseFloat(lng) } : {}),
                ...(speed !== undefined ? { speed: parseFloat(speed) } : {}),
                ...(heading !== undefined ? { heading: parseFloat(heading) } : {}),
                ...(fuelLevel !== undefined ? { fuelLevel: parseFloat(fuelLevel) } : {}),
                ...(batteryLevel !== undefined ? { batteryLevel: parseInt(batteryLevel) } : {}),
                lastPing: new Date()
            },
            include: {
                organization: { select: { name: true, code: true } }
            }
        });

        // Record location log if coordinates provided
        if (lat !== undefined && lng !== undefined) {
            await prisma.locationLog.create({
                data: {
                    assetId: id,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    speed: parseFloat(speed) || 0,
                    heading: parseFloat(heading) || 0,
                    batteryLevel: parseInt(batteryLevel) || 100
                }
            }).catch(e => console.error("Asset location log error:", e));
        }

        memoryCache.invalidate(FLEET_ASSETS_CACHE_KEY);

        return NextResponse.json(updated);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal error";
        console.error("Update fleet asset error:", error);
        return NextResponse.json({ error: "Failed to update fleet asset", details: msg }, { status: 500 });
    }
}
