import { NextResponse } from "next/server";
import { confirmCustomerDeposit, cancelOrRejectDeposit } from "@/services/mobileMoneyService";
import { getPaymentConfig } from "@/lib/paymentDb";

/**
 * POST /api/payments/momo/webhook
 * MTN Mobile Money Collections callback webhook endpoint.
 * Called by MTN MoMo API when customer enters PIN or prompt times out.
 * 
 * Official MTN MoMo callback structure:
 * {
 *   "referenceId": "UUID",
 *   "status": "SUCCESSFUL" | "FAILED",
 *   "amount": "10.00",
 *   "currency": "LRD",
 *   "financialTransactionId": "12345678",
 *   "externalId": "DEP-MTN_MOMO-RIDE-...",
 *   "payer": { "partyIdType": "MSISDN", "partyId": "0886000100" }
 * }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const config = await getPaymentConfig();

        console.log("[MTN MoMo Webhook Received]", JSON.stringify(body));

        const { externalId, referenceId, status, financialTransactionId, reason } = body;
        const targetId = externalId || referenceId;

        if (!targetId) {
            return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });
        }

        if (status === "SUCCESSFUL") {
            const externalRef = financialTransactionId || `MTN-FIN-${Date.now()}`;
            await confirmCustomerDeposit(targetId, externalRef);
            return NextResponse.json({ status: "ACCEPTED", message: "Deposit confirmed and wallet credited." });
        } else {
            await cancelOrRejectDeposit(targetId, reason || `MTN status: ${status}`);
            return NextResponse.json({ status: "ACCEPTED", message: "Deposit failure recorded." });
        }
    } catch (error: any) {
        console.error("MTN MoMo webhook processing error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
