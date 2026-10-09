import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryCache } from "@/lib/cache";
import bcrypt from "bcryptjs";

const DRIVERS_CACHE_KEY = "admin_drivers_list";

export async function GET() {
    try {
        const cached = memoryCache.get<any[]>(DRIVERS_CACHE_KEY);
        if (cached) {
            return NextResponse.json(cached);
        }

        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER' },
            include: {
                driverProfile: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log("API: Fetched drivers count:", drivers.length);

        const mappedDrivers = drivers.map(d => ({
            id: d.id,
            driverProfileId: d.driverProfile?.id,
            name: d.name,
            email: d.email,
            phone: d.phone,
            status: d.driverProfile?.isOnline ? "ONLINE" : "OFFLINE",
            rating: d.driverProfile?.rating || 5.0,
            vehicle: `${d.driverProfile?.vehicleColor || ""} ${d.driverProfile?.vehicleModel || ""}`.trim() || "N/A",
            licensePlate: d.driverProfile?.licensePlate || "N/A",
            joinedDate: new Date(d.createdAt).toLocaleDateString(),
            currentLat: d.driverProfile?.currentLat || null,
            currentLng: d.driverProfile?.currentLng || null,
            totalTrips: 0,
            earningsToday: 0
        }));

        memoryCache.set(DRIVERS_CACHE_KEY, mappedDrivers, 15);

        return NextResponse.json(mappedDrivers);
    } catch (error) {
        console.error("Fetch drivers error", error);
        return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name, email, phone, vehicle, licensePlate,
            driverLicense, issuedDate, expiryDate, dob, pob, country
        } = body;

        if (!name || !email || !phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash("Driver123!", 10);

        const newDriver = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                role: "DRIVER",
                driverProfile: {
                    create: {
                        vehicleModel: vehicle,
                        licensePlate,
                        driverLicense,
                        licenseIssued: issuedDate ? new Date(issuedDate) : null,
                        licenseExpiry: expiryDate ? new Date(expiryDate) : null,
                        dob: dob ? new Date(dob) : null,
                        pob,
                        country,
                        isOnline: false,
                        rating: 5.0
                    }
                }
            },
            include: {
                driverProfile: true
            }
        });

        memoryCache.invalidate(DRIVERS_CACHE_KEY);

        return NextResponse.json(newDriver);
    } catch (error) {
        console.error("Create driver error", error);
        return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
    }
}

