import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const coupons = await prisma.coupon.findMany({
            include: {
                _count: {
                    select: { redemptions: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(coupons);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            code,
            discount,
            type,
            expiry,
            startDate,
            minFare,
            maxDiscount,
            usageLimit,
            perCustomerLimit,
            applicableCategories,
            description
        } = body;

        if (!code || discount === undefined || !expiry) {
            return NextResponse.json({ error: "Code, discount amount, and expiration date are required." }, { status: 400 });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.trim().toUpperCase(),
                discount: parseFloat(discount),
                type: type || "PERCENTAGE",
                expiry: new Date(expiry),
                startDate: startDate ? new Date(startDate) : new Date(),
                minFare: minFare ? parseFloat(minFare) : 0,
                maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
                perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit, 10) : 1,
                applicableCategories: applicableCategories || "ALL",
                description: description || null,
            }
        });

        return NextResponse.json(coupon, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A promo code with this name already exists." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Failed to create coupon" }, { status: 400 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            id,
            isActive,
            discount,
            type,
            expiry,
            minFare,
            maxDiscount,
            usageLimit,
            perCustomerLimit,
            applicableCategories,
            description
        } = body;

        if (!id) return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });

        const updateData: any = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (discount !== undefined) updateData.discount = parseFloat(discount);
        if (type !== undefined) updateData.type = type;
        if (expiry) updateData.expiry = new Date(expiry);
        if (minFare !== undefined) updateData.minFare = parseFloat(minFare);
        if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
        if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit, 10) : null;
        if (perCustomerLimit !== undefined) updateData.perCustomerLimit = parseInt(perCustomerLimit, 10);
        if (applicableCategories !== undefined) updateData.applicableCategories = applicableCategories;
        if (description !== undefined) updateData.description = description;

        const coupon = await prisma.coupon.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(coupon);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update coupon" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.coupon.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Coupon deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete coupon" }, { status: 400 });
    }
}
