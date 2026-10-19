import { NextResponse } from "next/server";
import { confirmCustomerDeposit, cancelOrRejectDeposit } from "@/services/mobileMoneyService";
import { getPaymentConfig } from "@/lib/paymentDb";

/**
 * POST /api/payments/orange/webhook
 * Orange Money WebPay notification webhook endpoint.
 * Called by Orange Money when customer authorizes or cancels transaction.
 * 
 * Official Orange Money notification structure:
 * {
 *   "status": "SUCCESS" | "FAILED" | "CANCELLED",
 *   "notif_token": "...",
 *   "txnid": "OM-LR-894210",
 *   "order_id": "DEP-ORANGE_MONEY-RIDE-..."
 * }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const config = await getPaymentConfig();

        console.log("[Orange Money Webhook Received]", JSON.stringify(body));

        const { order_id, txnid, status, message } = body;
        const targetId = order_id || txnid;

        if (!targetId) {
            return NextResponse.json({ error: "Missing order reference" }, { status: 400 });
        }

        if (status === "SUCCESS" || status === "SUCCESSFUL") {
            const externalRef = txnid || `OM-TXN-${Date.now()}`;
            await confirmCustomerDeposit(targetId, externalRef);
            return NextResponse.json({ status: "OK", message: "Orange Money deposit verified and wallet credited." });
        } else {
            await cancelOrRejectDeposit(targetId, message || `Orange Money status: ${status}`);
            return NextResponse.json({ status: "OK", message: "Orange Money deposit failure recorded." });
        }
    } catch (error: any) {
        console.error("Orange Money webhook processing error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
