import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "ALL";
        const category = searchParams.get("category") || "ALL";
        const query = searchParams.get("q") || "";

        const whereClause: any = {};

        if (status && status !== "ALL") {
            whereClause.status = status;
        }

        if (category && category !== "ALL") {
            whereClause.category = category;
        }

        if (query.trim()) {
            whereClause.OR = [
                { reference: { contains: query.trim(), mode: "insensitive" } },
                { description: { contains: query.trim(), mode: "insensitive" } },
                { contactName: { contains: query.trim(), mode: "insensitive" } },
                { contactPhone: { contains: query.trim(), mode: "insensitive" } },
            ];
        }

        const reports = await prisma.lostItemReport.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, phone: true, email: true } },
                ride: {
                    include: {
                        driver: {
                            include: {
                                user: { select: { id: true, name: true, phone: true, email: true } }
                            }
                        },
                        rider: { select: { id: true, name: true, phone: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 100
        });

        // Compute summary counts
        const [pendingCount, contactedCount, foundCount, resolvedCount] = await Promise.all([
            prisma.lostItemReport.count({ where: { status: "PENDING" } }),
            prisma.lostItemReport.count({ where: { status: "DRIVER_CONTACTED" } }),
            prisma.lostItemReport.count({ where: { status: "ITEM_FOUND" } }),
            prisma.lostItemReport.count({ where: { status: "RESOLVED" } }),
        ]);

        return NextResponse.json({
            reports,
            counts: {
                pending: pendingCount,
                driverContacted: contactedCount,
                itemFound: foundCount,
                resolved: resolvedCount,
                total: reports.length
            }
        });
    } catch (error) {
        console.error("Admin GET lost items error:", error);
        return NextResponse.json({ error: "Failed to fetch lost items" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, status, adminNotes, driverResponse } = body;

        if (!id) {
            return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === "RESOLVED" || status === "CLOSED") {
                updateData.resolvedAt = new Date();
            }
        }
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
        if (driverResponse !== undefined) updateData.driverResponse = driverResponse;

        const updated = await prisma.lostItemReport.update({
            where: { id },
            data: updateData,
            include: {
                ride: {
                    include: {
                        driver: { include: { user: true } },
                        rider: true
                    }
                }
            }
        });

        // Log admin action
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: "LOST_ITEM_STATUS_UPDATED",
                    details: JSON.stringify({
                        reportId: id,
                        caseReference: updated.reference,
                        newStatus: status,
                        notes: adminNotes,
                        driverResponse
                    })
                }
            });
        } catch (lErr) {}

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Admin PATCH lost item error:", error);
        return NextResponse.json({ error: error.message || "Failed to update lost item report" }, { status: 500 });
    }
}
