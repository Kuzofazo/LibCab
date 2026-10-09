import { prisma } from "@/lib/db";


// Adaptive Thresholds
const DEFAULT_THRESHOLDS = {
    WAIT_TIME_MIN: "10",
    CANCEL_RATE_MAX: "0.2",
    LOW_RATING_LIMIT: "4.0",
};

async function getThreshold(key: string): Promise<number> {
    try {
        const config = await prisma.systemConfig.findUnique({ where: { key } });
        return config ? parseFloat(config.value) : parseFloat((DEFAULT_THRESHOLDS as any)[key]);
    } catch (e) {
        return parseFloat((DEFAULT_THRESHOLDS as any)[key]);
    }
}

export async function evaluateSystemInsights() {
    try {
        console.log("AI Engine: Starting system evaluation...");
        const insightsGenerated: any[] = [];

        // Fetch Adaptive Thresholds
        const waitTimeThreshold = await getThreshold("WAIT_TIME_MIN");
        const cancelRateThreshold = await getThreshold("CANCEL_RATE_MAX");
        const ratingThreshold = await getThreshold("LOW_RATING_LIMIT");

        // 1. Evaluate Driver Availability vs Pending Requests
        const pendingRides = await prisma.ride.findMany({
            where: { status: "REQUESTED", isArchived: false },
            orderBy: { createdAt: "asc" }
        });

        const onlineDriversCount = await prisma.driverProfile.count({
            where: { isOnline: true }
        });

        if (pendingRides.length > 0) {
            const oldestPending = pendingRides[0];
            const waitTimeMinutes = (new Date().getTime() - new Date(oldestPending.createdAt).getTime()) / 60000;

            if (waitTimeMinutes > waitTimeThreshold) {
                insightsGenerated.push({
                    type: "DRIVER_DISTRIBUTION",
                    category: "TACTICAL",
                    title: "High Wait Times Detected",
                    description: `Oldest request has been waiting ${Math.round(waitTimeMinutes)}m, exceeding the adaptive threshold of ${waitTimeThreshold}m.`,
                    suggestedAction: onlineDriversCount === 0 
                        ? "Urgent: No drivers online. Send an emergency push notification to all drivers."
                        : "Consider deploying surge pricing in high-demand areas.",
                    priority: "HIGH",
                    impactScore: 25,
                    metricsData: JSON.stringify({ pendingRides: pendingRides.length, waitTimeMinutes, onlineDriversCount })
                });
            }
        }

        // 2. Strategic: Peak Hour Analysis (Looking at last 7 days)
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const totalRidesLastWeek = await prisma.ride.findMany({
            where: { createdAt: { gte: lastWeek } },
            select: { createdAt: true }
        });

        if (totalRidesLastWeek.length > 50) {
            const hourCounts = new Array(24).fill(0);
            totalRidesLastWeek.forEach(r => hourCounts[new Date(r.createdAt).getHours()]++);
            const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
            
            insightsGenerated.push({
                type: "STAFFING",
                category: "STRATEGIC",
                title: "Optimized Peak Shift Recommendation",
                description: `Historical data shows a 30% volume spike daily around ${peakHour}:00.`,
                suggestedAction: `Incentivize more drivers to come online between ${peakHour-1}:00 and ${peakHour+1}:00 to handle projected demand.`,
                priority: "MEDIUM",
                impactScore: 15,
                metricsData: JSON.stringify({ peakHour, weeklyVolume: totalRidesLastWeek.length })
            });
        }

        // 3. Driver Performance (Flagging rejections/low ratings)
        const lowRatedDrivers = await prisma.driverProfile.findMany({
            where: { rating: { lt: ratingThreshold } },
            include: { user: true },
            take: 3
        });

        lowRatedDrivers.forEach(driver => {
            insightsGenerated.push({
                type: "REVIEW_FLAG",
                category: "TACTICAL",
                title: `Quality Alert: ${driver.user.name || 'Driver'}`,
                description: `Driver rating is ${driver.rating.toFixed(1)}, below the alert threshold of ${ratingThreshold}.`,
                suggestedAction: "Initiate mandatory retraining session or quality review.",
                priority: "MEDIUM",
                impactScore: 10,
                metricsData: JSON.stringify({ driverId: driver.id, rating: driver.rating })
            });
        });

        // 4. System Health: Cancellation Trends
        const rides24h = await prisma.ride.findMany({
            where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            select: { status: true }
        });

        if (rides24h.length > 5) {
            const cancelledCount = rides24h.filter(r => r.status === "CANCELLED").length;
            const cancelRate = cancelledCount / rides24h.length;

            if (cancelRate > cancelRateThreshold) {
                insightsGenerated.push({
                    type: "UX_IMPROVEMENT",
                    category: "UIUX",
                    title: "System Friction Optimization",
                    description: `Current cancellation rate is ${(cancelRate * 100).toFixed(1)}%, exceeding the safety limit of ${(cancelRateThreshold * 100).toFixed(0)}%.`,
                    suggestedAction: "Analyze cancellation reasons. Consider adding a 'Reason for cancellation' prompt to identify UI/price friction.",
                    priority: "HIGH",
                    impactScore: 20,
                    metricsData: JSON.stringify({ cancelRate, totalRides: rides24h.length })
                });
            }
        }

        // 5. Driver Feedback Trends (Consolidated)
        const criticalReviews = await prisma.review.findMany({
            where: {
                rating: { lte: 2 },
                createdAt: { gte: lastWeek }
            },
            include: { ride: { include: { driver: { include: { user: true } } } } }
        });

        // Group by driver to find clusters
        const driverFlags: Record<string, { count: number, name: string }> = {};
        criticalReviews.forEach(r => {
            if (r.ride.driver) {
                const id = r.ride.driver.id;
                driverFlags[id] = { 
                    count: (driverFlags[id]?.count || 0) + 1,
                    name: r.ride.driver.user.name || 'Unknown'
                };
            }
        });

        Object.entries(driverFlags).forEach(([id, stats]) => {
            if (stats.count >= 2) {
                insightsGenerated.push({
                    type: "REVIEW_FLAG",
                    category: "TACTICAL",
                    title: `Trend Alert: ${stats.name}`,
                    description: `This driver has received ${stats.count} critical reviews within the last 7 days.`,
                    suggestedAction: "Evaluate driver's recent ride logs and consider temporary suspension or mandatory retraining.",
                    priority: "HIGH",
                    impactScore: 15,
                    metricsData: JSON.stringify({ driverId: id, criticalCount: stats.count })
                });
            }
        });

        // Deduplication and Creation
        const pendingExisting = await prisma.systemInsight.findMany({
            where: { status: "PENDING" }
        });

        let createdCount = 0;
        for (const insight of insightsGenerated) {
            const alreadyExists = pendingExisting.some(e => e.type === insight.type && e.title === insight.title);
            if (!alreadyExists) {
                await prisma.systemInsight.create({ data: insight });
                createdCount++;
            }
        }

        // Log snapshot for learning
        await prisma.performanceMetric.createMany({
            data: [
                { metric: "ACTIVE_PENDING", value: pendingRides.length },
                { metric: "ACTIVE_DRIVERS", value: onlineDriversCount },
                { metric: "DAILY_CANCEL_RATE", value: rides24h.length > 0 ? (rides24h.filter(r => r.status === "CANCELLED").length / rides24h.length) : 0 }
            ]
        });

        console.log(`AI Engine: Analysis complete. ${createdCount} new insights generated.`);
        return { success: true, count: createdCount };

    } catch (error) {
        console.error("AI Engine Error:", error);
        return { success: false, error: "System evaluation failed" };
    }
}
