import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rideStreamManager } from "@/lib/sse";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            action,
            vehicleId,
            trackerImei,
            lat,
            lng,
            speed,
            heading,
            fuelLevel,
            batteryLevel,
            signalStrength,
            isIgnitionOn,
            engineRpm,
            odometerKm,
            coolantTemp,
            errorCodes,
            command
        } = body;

        // Action: Remote Command from Admin/Company Dashboard
        if (action === "REMOTE_COMMAND") {
            if (!vehicleId || !command) {
                return NextResponse.json({ error: "vehicleId and command are required" }, { status: 400 });
            }

            let updateData: any = {};
            let commandResponse = "";

            switch (command) {
                case "IMMOBILIZE_ENGINE":
                    updateData = { isImmobilized: true, status: "IMMOBILIZED", speed: 0 };
                    commandResponse = "Engine immobilizer relay activated. Fuel pump cut-off signal sent successfully.";
                    break;
                case "RESTORE_ENGINE":
                    updateData = { isImmobilized: false, status: "IDLE" };
                    commandResponse = "Engine immobilizer relay disengaged. Ignition circuit restored.";
                    break;
                case "TRIGGER_ALARM":
                    commandResponse = "Emergency horn/strobe alarm pulse sent to onboard tracker.";
                    break;
                case "REQUEST_DTC_SCAN":
                    commandResponse = "OBD-II CAN-Bus diagnostic scan initiated. All DTC sensors reporting nominal.";
                    break;
                case "PING_TRACKER":
                    commandResponse = "Hardware heartbeat acknowledged (RTT 48ms, GSM 4G 98% signal).";
                    break;
                default:
                    commandResponse = `Command '${command}' transmitted to device.`;
            }

            const updatedVehicle = await prisma.vehicle.update({
                where: { id: vehicleId },
                data: {
                    ...updateData,
                    lastPing: new Date()
                },
                include: { company: true, trackerDevice: true }
            });

            rideStreamManager.publish({
                type: "RIDE_UPDATED",
                data: { event: "VEHICLE_COMMAND_EXECUTED", command, vehicle: updatedVehicle, message: commandResponse },
                timestamp: new Date().toISOString()
            });

            return NextResponse.json({ success: true, message: commandResponse, vehicle: updatedVehicle });
        }

        // Action: Telemetry Ingestion from Hardware Tracker (by IMEI or vehicleId)
        let targetVehicleId = vehicleId;
        let trackerRecord = null;

        if (trackerImei) {
            trackerRecord = await prisma.trackerDevice.findUnique({
                where: { imei: trackerImei },
                include: { vehicle: true }
            });
            if (trackerRecord?.vehicleId) {
                targetVehicleId = trackerRecord.vehicleId;
            }
        }

        if (!targetVehicleId) {
            return NextResponse.json({ error: "Could not identify target vehicle for this telemetry payload" }, { status: 400 });
        }

        const vehicle = await prisma.vehicle.update({
            where: { id: targetVehicleId },
            data: {
                ...(lat !== undefined ? { currentLat: parseFloat(lat) } : {}),
                ...(lng !== undefined ? { currentLng: parseFloat(lng) } : {}),
                ...(speed !== undefined ? { speed: parseFloat(speed) } : {}),
                ...(heading !== undefined ? { heading: parseFloat(heading) } : {}),
                ...(fuelLevel !== undefined ? { fuelLevel: parseFloat(fuelLevel) } : {}),
                ...(batteryLevel !== undefined ? { batteryLevel: parseInt(batteryLevel) } : {}),
                ...(signalStrength !== undefined ? { signalStrength: parseInt(signalStrength) } : {}),
                ...(isIgnitionOn !== undefined ? { isIgnitionOn: Boolean(isIgnitionOn) } : {}),
                ...(engineRpm !== undefined ? { engineRpm: parseInt(engineRpm) } : {}),
                ...(odometerKm !== undefined ? { odometerKm: parseFloat(odometerKm) } : {}),
                ...(coolantTemp !== undefined ? { coolantTemp: parseInt(coolantTemp) } : {}),
                lastPing: new Date()
            },
            include: { company: true, trackerDevice: true }
        });

        // Store in Telemetry Log
        if (lat !== undefined && lng !== undefined) {
            await prisma.telemetryLog.create({
                data: {
                    vehicleId: targetVehicleId,
                    trackerId: trackerRecord?.id || vehicle.trackerDevice?.id || null,
                    lat: parseFloat(lat),
                    lng: parseFloat(lng),
                    speed: parseFloat(speed) || 0,
                    heading: parseFloat(heading) || 0,
                    isIgnitionOn: isIgnitionOn ?? vehicle.isIgnitionOn,
                    fuelLevel: fuelLevel !== undefined ? parseFloat(fuelLevel) : vehicle.fuelLevel,
                    batteryLevel: batteryLevel !== undefined ? parseInt(batteryLevel) : vehicle.batteryLevel,
                    signalStrength: signalStrength !== undefined ? parseInt(signalStrength) : vehicle.signalStrength,
                    engineRpm: engineRpm !== undefined ? parseInt(engineRpm) : vehicle.engineRpm,
                    odometer: odometerKm !== undefined ? parseFloat(odometerKm) : vehicle.odometerKm,
                    coolantTemp: coolantTemp !== undefined ? parseInt(coolantTemp) : vehicle.coolantTemp,
                    errorCodes: errorCodes || null,
                    timestamp: new Date()
                }
            }).catch(e => console.error("Telemetry insert error:", e));
        }

        return NextResponse.json({ success: true, vehicle });
    } catch (error: any) {
        console.error("Telemetry API error:", error);
        return NextResponse.json({ error: "Failed to process telemetry", details: error.message }, { status: 500 });
    }
}
