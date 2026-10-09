import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rideStreamManager } from "@/lib/sse";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId");
        const status = searchParams.get("status");
        const protocol = searchParams.get("protocol");
        const query = searchParams.get("q")?.trim().toLowerCase() || "";

        const trackers = await prisma.trackerDevice.findMany({
            where: {
                ...(companyId && companyId !== "ALL" ? { companyId } : {}),
                ...(status && status !== "ALL" ? { status } : {}),
                ...(protocol && protocol !== "ALL" ? { protocol } : {}),
                ...(query ? {
                    OR: [
                        { imei: { contains: query } },
                        { model: { contains: query } },
                        { simCardNumber: { contains: query } },
                        { serialNumber: { contains: query } },
                    ]
                } : {})
            },
            include: {
                company: {
                    select: { id: true, name: true, code: true }
                },
                vehicle: {
                    select: { id: true, name: true, licensePlate: true, vehicleType: true, status: true }
                }
            },
            orderBy: { updatedAt: "desc" }
        });

        const stats = {
            total: trackers.length,
            online: trackers.filter(t => t.status === "ONLINE").length,
            offline: trackers.filter(t => t.status === "OFFLINE").length,
            unprovisioned: trackers.filter(t => !t.vehicleId).length,
            tamperAlerts: trackers.filter(t => t.isTamperAlert).length
        };

        return NextResponse.json({ stats, trackers });
    } catch (error: any) {
        console.error("Trackers API error:", error);
        return NextResponse.json({ error: "Failed to fetch hardware trackers", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            imei,
            model = "Teltonika FMB920",
            protocol = "TELTONIKA",
            companyId,
            vehicleId,
            simCardNumber,
            serialNumber,
            firmwareVersion = "v1.4.2-rel"
        } = body;

        if (!imei) {
            return NextResponse.json({ error: "Hardware IMEI (15-digit) is required" }, { status: 400 });
        }

        const cleanImei = imei.trim().replace(/\s+/g, "");

        const existing = await prisma.trackerDevice.findUnique({ where: { imei: cleanImei } });
        if (existing) {
            return NextResponse.json({ error: `Tracker with IMEI ${cleanImei} is already registered.` }, { status: 400 });
        }

        const tracker = await prisma.trackerDevice.create({
            data: {
                imei: cleanImei,
                model,
                protocol,
                companyId: companyId || null,
                vehicleId: vehicleId || null,
                simCardNumber: simCardNumber?.trim() || null,
                serialNumber: serialNumber?.trim() || null,
                firmwareVersion,
                status: "ONLINE",
                lastPing: new Date(),
                batteryBackupPct: 100,
                voltageInput: 13.8
            },
            include: {
                company: { select: { id: true, name: true } },
                vehicle: { select: { id: true, name: true, licensePlate: true } }
            }
        });

        // Broadcast SSE event
        rideStreamManager.publish({
            type: "RIDE_UPDATED",
            data: { event: "NEW_TRACKER_PROVISIONED", tracker },
            timestamp: new Date().toISOString()
        });

        return NextResponse.json(tracker, { status: 201 });
    } catch (error: any) {
        console.error("Create tracker error:", error);
        return NextResponse.json({ error: "Failed to provision hardware tracker", details: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, companyId, vehicleId, status, isTamperAlert, simCardNumber, triggerPing } = body;

        if (!id) {
            return NextResponse.json({ error: "Tracker ID is required" }, { status: 400 });
        }

        const updated = await prisma.trackerDevice.update({
            where: { id },
            data: {
                ...(companyId !== undefined ? { companyId: companyId || null } : {}),
                ...(vehicleId !== undefined ? { vehicleId: vehicleId || null } : {}),
                ...(status ? { status } : {}),
                ...(isTamperAlert !== undefined ? { isTamperAlert } : {}),
                ...(simCardNumber !== undefined ? { simCardNumber } : {}),
                ...(triggerPing ? { lastPing: new Date(), status: "ONLINE" } : {})
            },
            include: {
                company: { select: { id: true, name: true } },
                vehicle: { select: { id: true, name: true, licensePlate: true } }
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Update tracker error:", error);
        return NextResponse.json({ error: "Failed to update hardware tracker", details: error.message }, { status: 500 });
    }
}
