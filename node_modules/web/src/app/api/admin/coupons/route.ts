import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(coupons);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, discount, type, expiry } = body;

        const coupon = await prisma.coupon.create({
            data: {
                code,
                discount: parseFloat(discount),
                type,
                expiry: new Date(expiry),
            }
        });

        return NextResponse.json(coupon);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create coupon" }, { status: 400 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, isActive } = body;

        const coupon = await prisma.coupon.update({
            where: { id },
            data: { isActive }
        });

        return NextResponse.json(coupon);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update coupon" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.coupon.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete coupon" }, { status: 400 });
    }
}
