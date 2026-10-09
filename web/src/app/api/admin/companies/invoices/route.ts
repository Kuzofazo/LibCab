import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const payload = await verifyJWT();
        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId");
        const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // e.g. "2026-08"

        if (!companyId) {
            return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                users: {
                    select: { id: true, name: true, email: true, phone: true }
                },
                vehicles: {
                    select: { id: true, name: true, licensePlate: true, vehicleType: true }
                }
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        // Get user IDs belonging to this corporate account
        const userIds = company.users.map(u => u.id);

        // Fetch completed rides for this company's staff during the billing period
        const startDate = new Date(`${month}-01T00:00:00.000Z`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

        const rides = await prisma.ride.findMany({
            where: {
                riderId: { in: userIds },
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                rider: { select: { name: true, email: true } },
                driver: {
                    include: {
                        user: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Compute invoice aggregates
        const totalRides = rides.length;
        const subtotalUsd = rides.reduce((sum, r) => sum + (r.fare || 0), 0);
        const corporateDiscountPct = company.plan === "ENTERPRISE" ? 15 : company.plan === "PRO" ? 10 : 5;
        const discountAmountUsd = Math.round((subtotalUsd * (corporateDiscountPct / 100)) * 100) / 100;
        const taxRatePct = 4.0; // Liberian Goods & Services Tax (GST) standard
        const taxableAmount = subtotalUsd - discountAmountUsd;
        const taxAmountUsd = Math.round((taxableAmount * (taxRatePct / 100)) * 100) / 100;
        const totalDueUsd = Math.round((taxableAmount + taxAmountUsd) * 100) / 100;

        // Group by department or staff member
        const staffBreakdown: Record<string, { name: string; count: number; total: number }> = {};
        rides.forEach(r => {
            const name = r.rider?.name || "Corporate Staff";
            if (!staffBreakdown[name]) {
                staffBreakdown[name] = { name, count: 0, total: 0 };
            }
            staffBreakdown[name].count += 1;
            staffBreakdown[name].total += r.fare || 0;
        });

        const invoiceNumber = `INV-${company.code || "CORP"}-${month.replace("-", "")}-${Date.now().toString().slice(-4)}`;

        return NextResponse.json({
            invoiceNumber,
            billingPeriod: month,
            issueDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Net-14 payment terms
            company: {
                id: company.id,
                name: company.name,
                code: company.code,
                category: company.category,
                email: company.email,
                phone: company.phone,
                address: company.address || "Monrovia, Liberia",
                plan: company.plan
            },
            summary: {
                totalRides,
                subtotalUsd,
                corporateDiscountPct,
                discountAmountUsd,
                taxRatePct,
                taxAmountUsd,
                totalDueUsd
            },
            staffBreakdown: Object.values(staffBreakdown),
            itemizedRides: rides.map(r => ({
                id: r.id,
                date: r.createdAt,
                staffName: r.rider?.name || "Corporate Staff",
                origin: r.originAddress,
                destination: r.destAddress,
                driverName: r.driver?.user?.name || "Verified Driver",
                fare: r.fare,
                status: r.status
            }))
        });
    } catch (error) {
        console.error("Corporate invoice generation error:", error);
        return NextResponse.json({ error: "Failed to generate corporate invoice" }, { status: 500 });
    }
}
