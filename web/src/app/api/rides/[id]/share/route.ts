import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import crypto from "crypto";

// POST: Generate or refresh a secure share token
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: rideId } = await params;
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            select: { id: true, riderId: true, shareToken: true, shareExpiresAt: true, isSharingActive: true }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        // Authorize: Only the rider or an admin can generate a sharing link
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && ride.riderId !== user.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Generate high-entropy 32-character token
        const shareToken = crypto.randomBytes(16).toString("hex");
        // Link expires in 24 hours or when trip completes
        const shareExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const updated = await prisma.ride.update({
            where: { id: rideId },
            data: {
                shareToken,
                shareExpiresAt,
                isSharingActive: true
            }
        });

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "https://africab-liberia.com";
        const shareUrl = `${origin}/share/${shareToken}`;

        return NextResponse.json({
            shareToken,
            shareUrl,
            expiresAt: shareExpiresAt,
            isSharingActive: true
        });
    } catch (error: any) {
        console.error("Generate share token error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate share link" }, { status: 500 });
    }
}

// DELETE: Stop sharing immediately
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: rideId } = await params;
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            select: { id: true, riderId: true }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && ride.riderId !== user.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.ride.update({
            where: { id: rideId },
            data: {
                isSharingActive: false,
            }
        });

        return NextResponse.json({ message: "Trip sharing stopped successfully", isSharingActive: false });
    } catch (error: any) {
        console.error("Stop sharing error:", error);
        return NextResponse.json({ error: error.message || "Failed to stop sharing" }, { status: 500 });
    }
}
