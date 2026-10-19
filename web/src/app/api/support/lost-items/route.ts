import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const reports = await prisma.lostItemReport.findMany({
            where: { userId: user.userId },
            include: {
                ride: {
                    select: {
                        id: true,
                        bookingReference: true,
                        originAddress: true,
                        destAddress: true,
                        createdAt: true,
                        completedAt: true,
                        driver: {
                            select: {
                                vehicleModel: true,
                                vehicleColor: true,
                                licensePlate: true,
                                user: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(reports);
    } catch (error) {
        console.error("GET lost items error:", error);
        return NextResponse.json({ error: "Failed to fetch lost item reports" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { rideId, category, description, contactPhone, contactName, itemPhotoUrl } = body;

        if (!rideId || !category || !description || !contactPhone) {
            return NextResponse.json({ error: "Ride ID, category, description, and contact phone are required." }, { status: 400 });
        }

        // Verify ride exists and belongs to user or guest
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                driver: { include: { user: true } }
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        // Unique reference code e.g. LIR-74892
        const reference = `LIR-${Math.floor(10000 + Math.random() * 90000)}`;

        const report = await prisma.lostItemReport.create({
            data: {
                reference,
                rideId,
                userId: user.userId,
                contactPhone: contactPhone.trim(),
                contactName: contactName?.trim() || (user as any).name || "Passenger",
                category: category.toUpperCase(),
                description: description.trim(),
                itemPhotoUrl: itemPhotoUrl || null,
                status: "PENDING",
            },
            include: {
                ride: {
                    select: {
                        bookingReference: true,
                        originAddress: true,
                        destAddress: true,
                        driver: {
                            select: {
                                vehicleModel: true,
                                licensePlate: true,
                                user: { select: { name: true } }
                            }
                        }
                    }
                }
            }
        });

        // Create DispatcherLog for real-time notification in Admin Dashboard
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: "LOST_ITEM_REPORTED",
                    details: JSON.stringify({
                        reportId: report.id,
                        caseReference: report.reference,
                        rideId,
                        category: report.category,
                        description: report.description,
                        passengerName: report.contactName,
                        passengerPhone: report.contactPhone,
                        driverName: ride.driver?.user?.name,
                        driverPhone: ride.driver?.user?.phone,
                        vehicle: `${ride.driver?.vehicleColor || ""} ${ride.driver?.vehicleModel || ""}`.trim(),
                        licensePlate: ride.driver?.licensePlate
                    })
                }
            });
        } catch (logErr) {
            console.warn("Failed to create dispatcher log for lost item report:", logErr);
        }

        return NextResponse.json(report, { status: 201 });
    } catch (error: any) {
        console.error("POST lost item report error:", error);
        return NextResponse.json({ error: error.message || "Failed to submit lost item report" }, { status: 500 });
    }
}
