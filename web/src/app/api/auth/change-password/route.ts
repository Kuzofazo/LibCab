import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyJWT } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "africab_super_secret_key_123";

export async function POST(req: Request) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: "Unauthorized: Please log in to change your password." }, { status: 401 });
        }

        const body = await req.json();
        const { currentPassword, newPassword, confirmPassword } = body;

        // Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User account not found." }, { status: 404 });
        }

        if (!user.isActive) {
            return NextResponse.json({ error: "Account is inactive. Please contact support." }, { status: 403 });
        }

        // Validate presence of new password
        if (!newPassword || typeof newPassword !== "string") {
            return NextResponse.json({ error: "New password is required." }, { status: 400 });
        }

        const trimmedNew = newPassword.trim();

        // Length validation
        if (trimmedNew.length < 6) {
            return NextResponse.json({ error: "New password must be at least 6 characters long." }, { status: 400 });
        }

        // Confirmation matching validation (if provided)
        if (confirmPassword !== undefined && confirmPassword !== null) {
            if (trimmedNew !== String(confirmPassword).trim()) {
                return NextResponse.json({ error: "New password and confirmation do not match." }, { status: 400 });
            }
        }

        // Current password verification if user already has an existing password in database
        if (user.password) {
            if (!currentPassword || typeof currentPassword !== "string") {
                return NextResponse.json({ 
                    error: "Current password is required to set a new password." 
                }, { status: 400 });
            }

            const isCurrentCorrect = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentCorrect) {
                return NextResponse.json({ 
                    error: "Current password is incorrect. Please check the password provided by your administrator or your previous password." 
                }, { status: 400 });
            }

            // Cannot reuse exact same password
            const isSameAsCurrent = await bcrypt.compare(trimmedNew, user.password);
            if (isSameAsCurrent) {
                return NextResponse.json({ 
                    error: "New password cannot be the same as your current password." 
                }, { status: 400 });
            }
        }

        // Secure password hashing with bcrypt salt 10
        const hashedPassword = await bcrypt.hash(trimmedNew, 10);

        // Update database: set new hashed password and clear forcePasswordChange flag
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                forcePasswordChange: false,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isActive: true,
                forcePasswordChange: true,
            }
        });

        // Audit Log in dispatcherLog
        await prisma.dispatcherLog.create({
            data: {
                dispatcherId: user.id,
                action: "PASSWORD_CHANGED",
                details: JSON.stringify({
                    message: `User ${user.email} (${user.role}) changed their account password.`,
                    userId: user.id,
                    role: user.role,
                    email: user.email,
                    timestamp: new Date().toISOString(),
                })
            }
        });

        // Issue fresh JWT token reflecting forcePasswordChange: false
        const newToken = jwt.sign(
            { 
                userId: updatedUser.id, 
                email: updatedUser.email, 
                role: updatedUser.role, 
                forcePasswordChange: false 
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return NextResponse.json({ 
            success: true,
            message: "Password changed successfully! You can now use your new password.",
            token: newToken,
            user: updatedUser
        });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Failed to update password. Please try again." }, { status: 500 });
    }
}
