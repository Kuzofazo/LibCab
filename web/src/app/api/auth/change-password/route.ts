import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyJWT } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const payload = await verifyJWT();
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { newPassword } = await req.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: payload.userId },
            data: {
                password: hashedPassword,
                forcePasswordChange: false,
            },
        });

        return NextResponse.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }
}
