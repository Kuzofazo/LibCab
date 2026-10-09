import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, phone, subject, message, organization } = body;

        if (!name || !email || !message) {
            return NextResponse.json(
                { success: false, error: "Name, email, and message are required." },
                { status: 400 }
            );
        }

        // Try to log into DispatcherLog or console for admin audit
        try {
            await prisma.dispatcherLog.create({
                data: {
                    action: "CLIENT_CONTACT_INQUIRY",
                    details: JSON.stringify({
                        name,
                        email,
                        phone: phone || "Not provided",
                        organization: organization || "Not provided",
                        subject: subject || "General Inquiry",
                        message,
                        receivedAt: new Date().toISOString(),
                    }),
                },
            });
        } catch (dbErr) {
            console.warn("Contact inquiry logged to console (DB fallback):", { name, email, subject });
        }

        return NextResponse.json({
            success: true,
            message: "Thank you for contacting AfriCab. Our Monrovia team will get back to you within 2 business hours.",
        });
    } catch (error: any) {
        console.error("Contact API error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to process your request. Please try again or call us directly." },
            { status: 500 }
        );
    }
}
