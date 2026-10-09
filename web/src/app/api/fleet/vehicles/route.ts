import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rideStreamManager } from "@/lib/sse";
import { memoryCache } from "@/lib/cache";

const FLEET_VEHICLES_CACHE_KEY = "fleet_vehicles_all";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId");
        const vehicleType = searchParams.get("vehicleType");
        const status = searchParams.get("status");
        const query = searchParams.get("q")?.trim().toLowerCase() || "";

        const isUnfiltered = (!companyId || companyId === "ALL") && (!vehicleType || vehicleType === "ALL") && (!status || status === "ALL") && !query;
        if (isUnfiltered) {
            const cached = memoryCache.get<{ stats: any; vehicles: any[] }>(FLEET_VEHICLES_CACHE_KEY);
            if (cached) return NextResponse.json(cached);
        }

        const vehicles = await prisma.vehicle.findMany({
            where: {
                ...(companyId && companyId !== "ALL" ? { companyId } : {}),
                ...(vehicleType && vehicleType !== "ALL" ? { vehicleType } : {}),
                ...(status && status !== "ALL" ? { status } : {}),
                ...(query ? {
                    OR: [
                        { name: { contains: query } },
                        { licensePlate: { contains: query } },
                        { make: { contains: query } },
                        { model: { contains: query } },
                        { driverName: { contains: query } },
                        { driverPhone: { contains: query } },
                        { vin: { contains: query } },
                        { geofenceZone: { contains: query } }
                    ]
                } : {})
            },
            include: {
                company: {
                    select: { id: true, name: true, code: true, category: true }
                },
                trackerDevice: {
                    select: {
                        id: true,
                        imei: true,
                        model: true,
                        protocol: true,
                        status: true,
                        simCardNumber: true,
                        batteryBackupPct: true,
                        voltageInput: true,
                        isTamperAlert: true,
                        lastPing: true
                    }
                },
                telemetryLogs: {
                    orderBy: { timestamp: "desc" },
                    take: 20,
                    select: {
                        id: true,
                        lat: true,
                        lng: true,
                        speed: true,
                        heading: true,
                        fuelLevel: true,
                        batteryLevel: true,
                        signalStrength: true,
                        isIgnitionOn: true,
                        engineRpm: true,
                        odometer: true,
                        errorCodes: true,
                        timestamp: true
                    }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        const stats = {
            total: vehicles.length,
            inTransit: vehicles.filter(v => v.status === "IN_TRANSIT").length,
            active: vehicles.filter(v => v.status === "ACTIVE").length,
            idle: vehicles.filter(v => v.status === "IDLE").length,
            maintenance: vehicles.filter(v => v.status === "MAINTENANCE").length,
            offline: vehicles.filter(v => v.status === "OFFLINE").length,
            immobilized: vehicles.filter(v => v.isImmobilized).length,
            trackedWithHardware: vehicles.filter(v => v.trackerDevice !== null).length
        };

        const result = { stats, vehicles };
        if (isUnfiltered) {
            memoryCache.set(FLEET_VEHICLES_CACHE_KEY, result, 10); // 10 s TTL
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Vehicles API error:", error);
        return NextResponse.json({ error: "Failed to fetch vehicles", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            companyId,
            name,
            make,
            model,
            year,
            licensePlate,
            vin,
            color,
            vehicleType = "CAR",
            driverName,
            driverPhone,
            driverLicense,
            geofenceZone = "Greater Monrovia Corridor",
            trackerImei,
            currentLat = 6.3156,
            currentLng = -10.8074
        } = body;

        if (!companyId || !name) {
            return NextResponse.json({ error: "Company ID and Vehicle Name are required" }, { status: 400 });
        }

        const newVehicle = await prisma.vehicle.create({
            data: {
                companyId,
                name: name.trim(),
                make: make?.trim() || null,
                model: model?.trim() || null,
                year: year ? parseInt(year) : null,
                licensePlate: licensePlate?.trim().toUpperCase() || null,
                vin: vin?.trim().toUpperCase() || null,
                color: color?.trim() || null,
                vehicleType,
                driverName: driverName?.trim() || null,
                driverPhone: driverPhone?.trim() || null,
                driverLicense: driverLicense?.trim() || null,
                geofenceZone,
                currentLat: parseFloat(currentLat) || 6.3156,
                currentLng: parseFloat(currentLng) || -10.8074,
                speed: 0,
                heading: 0,
                batteryLevel: 100,
                signalStrength: 100,
                fuelLevel: 100,
                odometerKm: 0,
                engineRpm: 0,
                isIgnitionOn: false,
                isImmobilized: false,
                status: "ACTIVE",
                lastPing: new Date()
            },
            include: {
                company: { select: { id: true, name: true, code: true } }
            }
        });

        // Link Tracker if IMEI provided
        if (trackerImei) {
            const cleanImei = trackerImei.trim();
            const tracker = await prisma.trackerDevice.findUnique({ where: { imei: cleanImei } });
            if (tracker) {
                await prisma.trackerDevice.update({
                    where: { id: tracker.id },
                    data: {
                        vehicleId: newVehicle.id,
                        companyId: newVehicle.companyId,
                        status: "ONLINE",
                        lastPing: new Date()
                    }
                });
            } else {
                // Auto provision tracker on the fly
                await prisma.trackerDevice.create({
                    data: {
                        imei: cleanImei,
                        model: "Teltonika FMB920",
                        protocol: "TELTONIKA",
                        companyId: newVehicle.companyId,
                        vehicleId: newVehicle.id,
                        status: "ONLINE",
                        lastPing: new Date()
                    }
                });
            }
        }

        // Broadcast real-time event
        rideStreamManager.publish({
            type: "RIDE_UPDATED",
            data: { event: "NEW_FLEET_VEHICLE", vehicle: newVehicle },
            timestamp: new Date().toISOString()
        });

        return NextResponse.json(newVehicle, { status: 201 });
    } catch (error: any) {
        console.error("Create vehicle error:", error);
        return NextResponse.json({ error: "Failed to create vehicle", details: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const {
            id,
            status,
            driverName,
            driverPhone,
            geofenceZone,
            isImmobilized,
            isIgnitionOn,
            lat,
            lng,
            speed,
            heading,
            fuelLevel,
            batteryLevel,
            signalStrength,
            odometerKm,
            engineRpm,
            coolantTemp
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });
        }

        const updated = await prisma.vehicle.update({
            where: { id },
            data: {
                ...(status ? { status } : {}),
                ...(driverName !== undefined ? { driverName } : {}),
                ...(driverPhone !== undefined ? { driverPhone } : {}),
                ...(geofenceZone !== undefined ? { geofenceZone } : {}),
                ...(isImmobilized !== undefined ? { isImmobilized, status: isImmobilized ? "IMMOBILIZED" : "ACTIVE" } : {}),
                ...(isIgnitionOn !== undefined ? { isIgnitionOn } : {}),
                ...(lat !== undefined ? { currentLat: parseFloat(lat) } : {}),
                ...(lng !== undefined ? { currentLng: parseFloat(lng) } : {}),
                ...(speed !== undefined ? { speed: parseFloat(speed) } : {}),
                ...(heading !== undefined ? { heading: parseFloat(heading) } : {}),
                ...(fuelLevel !== undefined ? { fuelLevel: parseFloat(fuelLevel) } : {}),
                ...(batteryLevel !== undefined ? { batteryLevel: parseInt(batteryLevel) } : {}),
                ...(signalStrength !== undefined ? { signalStrength: parseInt(signalStrength) } : {}),
                ...(odometerKm !== undefined ? { odometerKm: parseFloat(odometerKm) } : {}),
                ...(engineRpm !== undefined ? { engineRpm: parseInt(engineRpm) } : {}),
                ...(coolantTemp !== undefined ? { coolantTemp: parseInt(coolantTemp) } : {}),
                lastPing: new Date()
            },
            include: {
                company: { select: { id: true, name: true, code: true } },
                trackerDevice: true
            }
        });

        // Record telemetry log
        if (lat !== undefined && lng !== undefined) {
            await prisma.telemetryLog.create({
                data: {
                    vehicleId: id,
                    trackerId: updated.trackerDevice?.id || null,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    speed: parseFloat(speed) || 0,
                    heading: parseFloat(heading) || 0,
                    isIgnitionOn: isIgnitionOn ?? updated.isIgnitionOn,
                    fuelLevel: fuelLevel !== undefined ? parseFloat(fuelLevel) : updated.fuelLevel,
                    batteryLevel: batteryLevel !== undefined ? parseInt(batteryLevel) : updated.batteryLevel,
                    signalStrength: signalStrength !== undefined ? parseInt(signalStrength) : updated.signalStrength,
                    engineRpm: engineRpm !== undefined ? parseInt(engineRpm) : updated.engineRpm,
                    odometer: odometerKm !== undefined ? parseFloat(odometerKm) : updated.odometerKm,
                    coolantTemp: coolantTemp !== undefined ? parseInt(coolantTemp) : updated.coolantTemp,
                    timestamp: new Date()
                }
            }).catch(e => console.error("Telemetry log creation warning:", e));
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Update vehicle error:", error);
        return NextResponse.json({ error: "Failed to update vehicle", details: error.message }, { status: 500 });
    }
}
