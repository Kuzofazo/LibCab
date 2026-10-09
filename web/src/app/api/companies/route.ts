import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryCache } from "@/lib/cache";

const COMPANIES_CACHE_KEY = "admin_companies_list";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const status = searchParams.get("status");
        const query = searchParams.get("q")?.trim().toLowerCase() || "";

        const isUnfiltered = (!category || category === "ALL") && (!status || status === "ALL") && !query;
        if (isUnfiltered) {
            const cached = memoryCache.get<any[]>(COMPANIES_CACHE_KEY);
            if (cached) return NextResponse.json(cached);
        }

        const companies = await prisma.company.findMany({
            where: {
                ...(category && category !== "ALL" ? { category } : {}),
                ...(status && status !== "ALL" ? { status } : {}),
                ...(query ? {
                    OR: [
                        { name: { contains: query } },
                        { code: { contains: query } },
                        { contactPerson: { contains: query } },
                        { email: { contains: query } },
                    ]
                } : {})
            },
            include: {
                vehicles: {
                    select: {
                        id: true,
                        status: true,
                        vehicleType: true,
                        speed: true,
                        isIgnitionOn: true,
                        isImmobilized: true,
                        fuelLevel: true,
                        batteryLevel: true,
                        trackerDevice: {
                            select: { id: true, imei: true, model: true, status: true }
                        }
                    }
                },
                trackerDevices: {
                    select: {
                        id: true,
                        imei: true,
                        model: true,
                        protocol: true,
                        status: true,
                        lastPing: true
                    }
                },
                geofences: {
                    select: { id: true, name: true }
                },
                users: {
                    select: { id: true, name: true, email: true, role: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const formatted = companies.map(comp => {
            const totalVehicles = comp.vehicles.length;
            const inTransit = comp.vehicles.filter(v => v.status === "IN_TRANSIT").length;
            const active = comp.vehicles.filter(v => v.status === "ACTIVE").length;
            const idle = comp.vehicles.filter(v => v.status === "IDLE").length;
            const maintenance = comp.vehicles.filter(v => v.status === "MAINTENANCE").length;
            const immobilized = comp.vehicles.filter(v => v.isImmobilized).length;

            const totalTrackers = comp.trackerDevices.length;
            const onlineTrackers = comp.trackerDevices.filter(t => t.status === "ONLINE").length;

            return {
                id: comp.id,
                name: comp.name,
                code: comp.code,
                category: comp.category,
                email: comp.email,
                phone: comp.phone,
                contactPerson: comp.contactPerson,
                address: comp.address,
                plan: comp.plan,
                apiKey: comp.apiKey,
                status: comp.status,
                createdAt: comp.createdAt,
                stats: {
                    totalVehicles,
                    inTransit,
                    active,
                    idle,
                    maintenance,
                    immobilized,
                    totalTrackers,
                    onlineTrackers,
                    totalGeofences: comp.geofences.length,
                    totalMembers: comp.users.length
                },
                vehicles: comp.vehicles,
                trackerDevices: comp.trackerDevices,
                geofences: comp.geofences
            };
        });

        if (isUnfiltered) {
            memoryCache.set(COMPANIES_CACHE_KEY, formatted, 15);
        }

        return NextResponse.json(formatted);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal error";
        console.error("Fetch companies error:", error);
        return NextResponse.json({ error: "Failed to fetch companies", details: msg }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name,
            code,
            category = "LOGISTICS",
            email,
            phone,
            contactPerson,
            address,
            plan = "ENTERPRISE",
            initialGeofence = true
        } = body;

        if (!name || !code) {
            return NextResponse.json({ error: "Company name and unique company code are required" }, { status: 400 });
        }

        const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "-");

        const existing = await prisma.company.findUnique({ where: { code: cleanCode } });
        if (existing) {
            return NextResponse.json({ error: `Company with code '${cleanCode}' already exists.` }, { status: 400 });
        }

        const apiKey = `lib_live_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

        const company = await prisma.company.create({
            data: {
                name: name.trim(),
                code: cleanCode,
                category,
                email: email?.trim(),
                phone: phone?.trim(),
                contactPerson: contactPerson?.trim(),
                address: address?.trim(),
                plan,
                apiKey,
                status: "ACTIVE"
            }
        });

        // Initialize a default geofence for the company (Greater Monrovia Operations Zone)
        if (initialGeofence) {
            await prisma.geofence.create({
                data: {
                    companyId: company.id,
                    name: `${company.name} - Primary Operations Corridor`,
                    description: "Auto-provisioned default safe operational zone",
                    fenceType: "CIRCLE",
                    coordinates: JSON.stringify([6.3156, -10.8074]),
                    radiusMeters: 18000,
                    speedLimit: 75,
                    isAlertEnabled: true,
                    status: "ACTIVE"
                }
            }).catch(e => console.error("Default geofence creation warning:", e));
        }

        memoryCache.invalidate(COMPANIES_CACHE_KEY);

        return NextResponse.json(company, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal error";
        console.error("Create company error:", error);
        return NextResponse.json({ error: "Failed to create company", details: msg }, { status: 500 });
    }
}
