import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { memoryCache } from "@/lib/cache";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const driverId = searchParams.get("driverId");
        const riderId = searchParams.get("riderId");

        const cacheKey = `reviews_${driverId || ""}_${riderId || ""}`;
        const cached = memoryCache.get<object>(cacheKey);
        if (cached) return NextResponse.json(cached);

        const reviews = await prisma.review.findMany({
            where: {
                ride: {
                    driverId: driverId || undefined,
                    riderId: riderId || undefined,
                }
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                ride: { 
                    include: { 
                        driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
                        rider: { select: { id: true, name: true, email: true, phone: true } }
                    } 
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Compute summary statistics for Admin verification & progress
        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0
            ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
            : 5.0;

        const fiveStarCount = reviews.filter(r => r.rating === 5).length;
        const fourStarCount = reviews.filter(r => r.rating === 4).length;
        const threeStarCount = reviews.filter(r => r.rating === 3).length;
        const lowStarCount = reviews.filter(r => r.rating <= 2).length;

        const result = {
            reviews,
            stats: {
                totalReviews,
                avgRating,
                fiveStarCount,
                fourStarCount,
                threeStarCount,
                lowStarCount,
                satisfactionRate: totalReviews > 0 ? Math.round(((fiveStarCount + fourStarCount) / totalReviews) * 100) : 100
            }
        };

        memoryCache.set(cacheKey, result, 30);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Reviews GET error:", error);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { rideId, rating, comment, tags, targetRole = "DRIVER" } = body;

        if (!rideId || !rating) {
            return NextResponse.json({ error: "Ride ID and Rating are required" }, { status: 400 });
        }

        const parsedRating = Math.min(5, Math.max(1, parseInt(rating)));

        // 1. Get the ride
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: { 
                driver: { include: { user: true } },
                rider: true
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        // Format formatted comment with tags if provided
        const tagsString = Array.isArray(tags) && tags.length > 0 ? ` [Tags: ${tags.join(", ")}]` : "";
        const rolePrefix = targetRole === "RIDER" ? "[Driver -> Rider Feedback] " : "";
        const formattedComment = `${rolePrefix}${comment || ""}${tagsString}`.trim();

        // 2. Create or Update the review (compound unique: rideId + targetRole)
        const review = await prisma.review.upsert({
            where: { rideId_targetRole: { rideId, targetRole } },
            update: {
                rating: parsedRating,
                comment: formattedComment,
                userId: user.userId
            },
            create: {
                rideId,
                userId: user.userId,
                targetRole,
                rating: parsedRating,
                comment: formattedComment
            }
        });

        // 3. If Rider rated the Driver -> Update Driver average rating
        if (targetRole === "DRIVER" && ride.driverId && ride.driver) {
            const driver = ride.driver;
            const newReviewCount = (driver.reviewCount || 0) + 1;
            const currentRating = driver.rating || 5.0;
            const newRating = Number((((currentRating * (driver.reviewCount || 0)) + parsedRating) / newReviewCount).toFixed(2));

            await prisma.driverProfile.update({
                where: { id: ride.driverId },
                data: {
                    rating: newRating,
                    reviewCount: newReviewCount
                }
            });
        }

        // 4. Record Dispatcher / Verification Audit Log
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: targetRole === "DRIVER" ? "RIDER_RATED_DRIVER" : "DRIVER_RATED_RIDER",
                    details: JSON.stringify({
                        rideId,
                        rating: parsedRating,
                        targetRole,
                        reviewerId: user.userId,
                        tags: tags || [],
                        comment: comment || ""
                    })
                }
            });
        } catch (e) {
            // non-blocking
        }

        // 5. Trigger AI / Admin Critical Insight if rating is low (<= 2 stars)
        if (parsedRating <= 2) {
            try {
                const targetName = targetRole === "DRIVER" 
                    ? (ride.driver?.user?.name || `Driver #${ride.driverId?.slice(-4)}`)
                    : (ride.rider?.name || ride.guestName || "Passenger");

                await prisma.systemInsight.create({
                    data: {
                        type: "REVIEW_FLAG",
                        category: "TACTICAL",
                        title: `Critical Rating Alert: ${targetName} (${targetRole})`,
                        description: `A ${parsedRating}-star rating was submitted for Ride #${rideId.slice(-4)}. Feedback: "${comment || 'No specific comment'}"`,
                        suggestedAction: `Admin review required for ${targetRole.toLowerCase()} performance and verification.`,
                        priority: "HIGH",
                        impactScore: 15,
                        metricsData: JSON.stringify({ rideId, driverId: ride.driverId, riderId: ride.riderId, rating: parsedRating, targetRole })
                    }
                });
            } catch (err) {
                console.error("AI Insight trigger failed:", err);
            }
        }

        return NextResponse.json({ success: true, review });
    } catch (error: any) {
        console.error("Review creation error:", error);
        return NextResponse.json({ error: "Failed to create review", details: error.message }, { status: 500 });
    }
}
