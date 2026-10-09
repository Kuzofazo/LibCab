import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { evaluateSystemInsights } from "@/lib/aiEngine";
import { memoryCache } from "@/lib/cache";

const INSIGHTS_CACHE_KEY = "admin_system_insights";

export async function GET(req: Request) {
    try {
        // Optionally run evaluation on every fetch or rely on manual/cron triggers.
        const url = new URL(req.url);
        if (url.searchParams.get("auto_eval") === "true") {
            await evaluateSystemInsights();
            memoryCache.invalidate(INSIGHTS_CACHE_KEY);
        }

        const cached = memoryCache.get<object[]>(INSIGHTS_CACHE_KEY);
        if (cached) return NextResponse.json(cached);

        const insights = await prisma.systemInsight.findMany({
            orderBy: [
                { status: "asc" }, // PENDING first
                { createdAt: "desc" }
            ],
            take: 20
        });

        memoryCache.set(INSIGHTS_CACHE_KEY, insights, 60);
        return NextResponse.json(insights);
    } catch (error) {
        console.error("Insights API Error:", error);
        return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const result = await evaluateSystemInsights();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Insights Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
    }
}
