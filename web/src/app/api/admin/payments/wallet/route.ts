import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getCompanyWallet, getDepositTransactions } from "@/lib/paymentDb";

/**
 * GET /api/admin/payments/wallet
 * Returns current company wallet balances and the auditable transaction ledger.
 */
export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "ALL";
        const provider = searchParams.get("provider") || "ALL";
        const search = searchParams.get("search") || "";

        const [wallet, transactions] = await Promise.all([
            getCompanyWallet(),
            getDepositTransactions({ status, provider, search, limit: 100 })
        ]);

        return NextResponse.json({
            wallet,
            transactions
        });
    } catch (error: any) {
        console.error("Fetch wallet data error:", error);
        return NextResponse.json({ error: "Failed to retrieve wallet ledger" }, { status: 500 });
    }
}
