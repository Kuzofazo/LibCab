import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER' },
            include: {
                driverProfile: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log("API: Fetched drivers count:", drivers.length);
        console.log("API: Drivers:", JSON.stringify(drivers, null, 2));

        // Map to a more useful format for the UI

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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name, email, phone, vehicle, licensePlate,
            driverLicense, issuedDate, expiryDate, dob, pob, country
        } = body;

        // Simple validation
        if (!name || !email || !phone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
        }

        // Hash default password
        // Note: For a real app, we'd email them a setup link. Here we use a default.
        // const hashedPassword = await bcrypt.hash("Driver123!", 10);
        // Using simple string for now if bcrypt import is an issue with strict mode, 
        // but package.json has bcryptjs. Let's try to import it.

        // Dynamic import to avoid build issues if not used elsewhere commonly or if types are strict
        const bcrypt = require("bcryptjs");
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
                        // Using 'as any' to bypass stale Prisma client types
                        driverLicense,
                        licenseIssued: issuedDate ? new Date(issuedDate) : null,
                        licenseExpiry: expiryDate ? new Date(expiryDate) : null,
                        dob: dob ? new Date(dob) : null,
                        pob,
                        country,
                        isOnline: false,
                        rating: 5.0
                    } as any
                }
            },
            include: {
                driverProfile: true
            }
        });

        return NextResponse.json(newDriver);
    } catch (error) {
        console.error("Create driver error", error);
        return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
    }
}
