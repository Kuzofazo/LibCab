import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getPaymentConfig, savePaymentConfig } from "@/lib/paymentDb";

/**
 * GET /api/admin/payments/config
 * Retrieves current MTN, Orange, and deposit calculation rules.
 * Masks sensitive API keys and secrets for secure display.
 */
export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
        }

        const config = await getPaymentConfig();

        // Mask sensitive credentials
        const masked = {
            ...config,
            mtn: {
                ...config.mtn,
                apiKey: config.mtn.apiKey ? "••••••••••••••••" : "",
                subscriptionKey: config.mtn.subscriptionKey ? "••••••••••••••••" : "",
            },
            orange: {
                ...config.orange,
                clientSecret: config.orange.clientSecret ? "••••••••••••••••" : "",
                merchantKey: config.orange.merchantKey ? "••••••••••••••••" : "",
            }
        };

        return NextResponse.json(masked);
    } catch (error: any) {
        console.error("Fetch payment config error:", error);
        return NextResponse.json({ error: "Failed to load payment configuration" }, { status: 500 });
    }
}

/**
 * POST /api/admin/payments/config
 * Updates payment settings and deposit rules.
 */
export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
        }

        const body = await req.json();
        const current = await getPaymentConfig();

        // Preserve existing secrets if masked values (••••) are sent back unchanged
        const sanitizedMtn = {
            ...body.mtn,
            apiKey: body.mtn?.apiKey && !body.mtn.apiKey.includes("••") ? body.mtn.apiKey : current.mtn.apiKey,
            subscriptionKey: body.mtn?.subscriptionKey && !body.mtn.subscriptionKey.includes("••") ? body.mtn.subscriptionKey : current.mtn.subscriptionKey,
        };

        const sanitizedOrange = {
            ...body.orange,
            clientSecret: body.orange?.clientSecret && !body.orange.clientSecret.includes("••") ? body.orange.clientSecret : current.orange.clientSecret,
            merchantKey: body.orange?.merchantKey && !body.orange.merchantKey.includes("••") ? body.orange.merchantKey : current.orange.merchantKey,
        };

        const updated = await savePaymentConfig({
            mtn: sanitizedMtn,
            orange: sanitizedOrange,
            depositRules: body.depositRules,
        });

        return NextResponse.json({
            message: "Payment settings and deposit rules updated successfully",
            config: updated
        });
    } catch (error: any) {
        console.error("Save payment config error:", error);
        return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
    }
}
