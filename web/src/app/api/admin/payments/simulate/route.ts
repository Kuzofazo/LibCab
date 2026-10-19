import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { confirmCustomerDeposit, cancelOrRejectDeposit } from "@/services/mobileMoneyService";

/**
 * POST /api/admin/payments/simulate
 * Sandbox testing utility for administrators to simulate customer USSD/PIN authorization
 * or transaction failure without requiring real telecom network prompts.
 */
export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
        }

        const body = await req.json();
        const { transactionId, action, reason } = body;

        if (!transactionId) {
            return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
        }

        if (action === "REJECT" || action === "FAIL") {
            const result = await cancelOrRejectDeposit(
                transactionId, 
                reason || "Customer cancelled USSD authorization prompt in simulation."
            );
            return NextResponse.json({
                message: "Simulation: Transaction marked as FAILED. Wallet available balance was NOT credited.",
                result
            });
        }

        // Default action: APPROVE / CONFIRM
        const externalSimId = `MOMO-SIM-${Date.now().toString(36).toUpperCase()}`;
        const result = await confirmCustomerDeposit(transactionId, externalSimId);

        return NextResponse.json({
            message: "Simulation: Customer PIN confirmed! Deposit marked SUCCESSFUL and Company Wallet credited.",
            result
        });
    } catch (error: any) {
        console.error("Simulation error:", error);
        return NextResponse.json({ error: "Failed to simulate transaction event" }, { status: 500 });
    }
}
