import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { code, fare, rideCategory, phone } = body;

        if (!code || !fare) {
            return NextResponse.json({ error: "Promo code and fare amount are required" }, { status: 400 });
        }

        const normalizedCode = code.trim().toUpperCase();
        const currentFare = parseFloat(fare);

        // Find coupon
        const coupon = await prisma.coupon.findUnique({
            where: { code: normalizedCode },
            include: {
                redemptions: true
            }
        });

        if (!coupon) {
            return NextResponse.json({ valid: false, error: "Invalid promo code. Please check and try again." }, { status: 404 });
        }

        if (!coupon.isActive) {
            return NextResponse.json({ valid: false, error: "This promo campaign is currently paused or inactive." }, { status: 400 });
        }

        const now = new Date();

        // Start Date check
        if (coupon.startDate && now < new Date(coupon.startDate)) {
            return NextResponse.json({ valid: false, error: "This promo code is not active yet." }, { status: 400 });
        }

        // Expiry check
        if (now > new Date(coupon.expiry)) {
            return NextResponse.json({ valid: false, error: "This promo code has expired." }, { status: 400 });
        }

        // Minimum Fare check
        if (coupon.minFare && currentFare < coupon.minFare) {
            return NextResponse.json({
                valid: false,
                error: `This code requires a minimum ride fare of $${coupon.minFare.toFixed(2)}.`
            }, { status: 400 });
        }

        // Ride Category check
        if (coupon.applicableCategories && coupon.applicableCategories !== "ALL" && rideCategory) {
            const allowed = coupon.applicableCategories.toLowerCase().split(",").map(c => c.trim());
            if (!allowed.includes(rideCategory.toLowerCase())) {
                return NextResponse.json({
                    valid: false,
                    error: `This discount is only applicable to ${coupon.applicableCategories} rides.`
                }, { status: 400 });
            }
        }

        // Total Global Usage Limit check
        if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
            return NextResponse.json({ valid: false, error: "This promo code has reached its maximum global redemptions." }, { status: 400 });
        }

        // Per-Customer Usage Limit check
        let callerUserId: string | null = null;
        try {
            const user = await verifyJWT(req);
            if (user) callerUserId = user.userId;
        } catch {}

        if (callerUserId || phone) {
            const customerRedemptionCount = await prisma.couponRedemption.count({
                where: {
                    couponId: coupon.id,
                    OR: [
                        ...(callerUserId ? [{ userId: callerUserId }] : []),
                        ...(phone ? [{ phone }] : [])
                    ]
                }
            });

            const perCustomerLimit = coupon.perCustomerLimit ?? 1;
            if (customerRedemptionCount >= perCustomerLimit) {
                return NextResponse.json({
                    valid: false,
                    error: `You have already redeemed this promo code the maximum allowed (${perCustomerLimit} time${perCustomerLimit > 1 ? "s" : ""}).`
                }, { status: 400 });
            }
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.type === "PERCENTAGE") {
            discountAmount = (currentFare * coupon.discount) / 100;
        } else {
            discountAmount = coupon.discount;
        }

        // Apply max discount cap if configured
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
        }

        // Ensure discount cannot exceed fare
        discountAmount = Math.min(discountAmount, currentFare);
        discountAmount = Math.round(discountAmount * 100) / 100;

        const newFare = Math.max(0, Math.round((currentFare - discountAmount) * 100) / 100);

        return NextResponse.json({
            valid: true,
            code: coupon.code,
            discountType: coupon.type,
            discountValue: coupon.discount,
            discountAmount,
            originalFare: currentFare,
            newFare,
            message: coupon.type === "PERCENTAGE"
                ? `${coupon.discount}% discount applied! You save $${discountAmount.toFixed(2)}.`
                : `$${discountAmount.toFixed(2)} discount applied!`
        });
    } catch (error: any) {
        console.error("Promo validation error:", error);
        return NextResponse.json({ valid: false, error: "Failed to validate promo code" }, { status: 500 });
    }
}
