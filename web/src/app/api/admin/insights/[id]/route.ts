import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


async function adjustThreshold(type: string, accepted: boolean) {
    let configKey = "";
    let step = 0;
    let min = 0;
    let max = 0;

    switch (type) {
        case "DRIVER_DISTRIBUTION":
            configKey = "WAIT_TIME_MIN";
            step = accepted ? -1 : 2; // If accepted, tighten slightly. If ignored, relax.
            min = 5;
            max = 30;
            break;
        case "UX_IMPROVEMENT":
            configKey = "CANCEL_RATE_MAX";
            step = accepted ? -0.05 : 0.1;
            min = 0.05;
            max = 0.5;
            break;
        case "REVIEW_FLAG":
            configKey = "LOW_RATING_LIMIT";
            step = accepted ? 0.1 : -0.2; // Ratings are inverted logic (lower is worse)
            min = 3.0;
            max = 4.5;
            break;
    }

    if (!configKey) return;

    const existing = await prisma.systemConfig.findUnique({ where: { key: configKey } });
    let val = existing ? parseFloat(existing.value) : (configKey === "WAIT_TIME_MIN" ? 10 : (configKey === "CANCEL_RATE_MAX" ? 0.2 : 4.0));
    
    val = Math.max(min, Math.min(max, val + step));

    await prisma.systemConfig.upsert({
        where: { key: configKey },
        update: { value: val.toString() },
        create: { key: configKey, value: val.toString() }
    });
    
    console.log(`AI Engine: Adjusted ${configKey} to ${val} due to admin ${accepted ? 'acceptance' : 'ignorance'}.`);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        if (!status || !["PENDING", "ACCEPTED", "REJECTED", "IGNORED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const insight = await prisma.systemInsight.update({
            where: { id },
            data: { status }
        });

        // Trigger Adaptation Learning
        if (status === "ACCEPTED" || status === "IGNORED") {
            await adjustThreshold(insight.type, status === "ACCEPTED");
        }

        return NextResponse.json(insight);
    } catch (error) {
        console.error("Insight Update Error:", error);
        return NextResponse.json({ error: "Failed to update insight" }, { status: 500 });
    }
}
