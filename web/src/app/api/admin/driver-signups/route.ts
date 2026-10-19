import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { ensureDriverApprovalSchema } from "@/lib/driverApprovalDb";
import { memoryCache } from "@/lib/cache";
import { rideStreamManager } from "@/lib/sse";

const SIGNUPS_CACHE_KEY = "admin_driver_signups_list";

/**
 * GET /api/admin/driver-signups
 * Fetches all driver applications, vehicle specs, and approval statuses with real-time stats
 */
export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
        }

        await ensureDriverApprovalSchema();

        const { searchParams } = new URL(req.url);
        const statusFilter = searchParams.get("status"); // PENDING, APPROVED, REJECTED, ALL
        const search = searchParams.get("search")?.toLowerCase().trim();

        const drivers = await prisma.user.findMany({
            where: {
                role: "DRIVER",
                ...(search ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        { phone: { contains: search, mode: "insensitive" } },
                        { driverProfile: { licensePlate: { contains: search, mode: "insensitive" } } },
                        { driverProfile: { driverLicense: { contains: search, mode: "insensitive" } } },
                        { driverProfile: { vehicleModel: { contains: search, mode: "insensitive" } } },
                    ]
                } : {})
            },
            include: {
                driverProfile: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const mapped = drivers.map(d => {
            const dp = d.driverProfile;
            const approvalStatus = dp?.approvalStatus || "PENDING";
            return {
                id: d.id,
                driverProfileId: dp?.id || null,
                name: d.name || "Unnamed Driver",
                email: d.email,
                phone: d.phone || "No phone provided",
                registrationDate: d.createdAt,
                approvalStatus,
                rejectionReason: dp?.rejectionReason || null,
                reviewedAt: dp?.reviewedAt || null,
                reviewedBy: dp?.reviewedBy || null,
                vehicleType: dp?.vehicleType || "Car",
                vehicleModel: dp?.vehicleModel || "Standard Vehicle",
                vehicleColor: dp?.vehicleColor || "N/A",
                licensePlate: dp?.licensePlate || "N/A",
                driverLicense: dp?.driverLicense || "N/A",
                isOnline: dp?.isOnline || false,
                rating: dp?.rating || 5.0,
                reviewCount: dp?.reviewCount || 0,
                country: dp?.country || "Liberia",
            };
        });

        // Compute summary counts across all registered drivers
        const stats = {
            total: mapped.length,
            pending: mapped.filter(d => d.approvalStatus === "PENDING").length,
            approved: mapped.filter(d => d.approvalStatus === "APPROVED").length,
            rejected: mapped.filter(d => d.approvalStatus === "REJECTED").length,
        };

        const filtered = statusFilter && statusFilter !== "ALL"
            ? mapped.filter(d => d.approvalStatus === statusFilter)
            : mapped;

        return NextResponse.json({
            applications: filtered,
            stats
        });
    } catch (error) {
        console.error("Fetch driver signups error (using fallback):", error);
        return NextResponse.json({
            applications: [],
            stats: { total: 0, pending: 0, approved: 0, rejected: 0 }
        });
    }
}

/**
 * POST /api/admin/driver-signups
 * Performs Approve or Reject actions on a driver application
 */
export async function POST(req: Request) {
    try {
        const adminUser = await verifyJWT(req);
        if (!adminUser || (adminUser.role !== "ADMIN" && adminUser.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
        }

        await ensureDriverApprovalSchema();

        const body = await req.json();
        const { driverProfileId, userId, action, reason } = body;

        if (!action || (!driverProfileId && !userId)) {
            return NextResponse.json({ error: "Missing required fields: action and driver identifier" }, { status: 400 });
        }

        const profile = await prisma.driverProfile.findFirst({
            where: {
                OR: [
                    ...(driverProfileId ? [{ id: driverProfileId }] : []),
                    ...(userId ? [{ userId }] : []),
                ]
            },
            include: { user: true }
        });

        if (!profile) {
            return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
        }

        const reviewerIdentifier = adminUser.email || "System Administrator";

        if (action === "APPROVE") {
            const updated = await prisma.driverProfile.update({
                where: { id: profile.id },
                data: {
                    approvalStatus: "APPROVED",
                    rejectionReason: null,
                    reviewedAt: new Date(),
                    reviewedBy: reviewerIdentifier,
                },
                include: { user: true }
            });

            // Automatically create individual wallet for approved driver
            try {
                const { ensureDriverWallet } = await import("@/lib/walletService");
                await ensureDriverWallet(profile.id, {
                    userId: profile.userId,
                    name: profile.user?.name || undefined,
                    email: profile.user?.email || undefined,
                    phone: profile.user?.phone || undefined,
                    vehicleModel: profile.vehicleModel || undefined,
                    licensePlate: profile.licensePlate || undefined,
                });
            } catch (walletErr) {
                console.error("Failed to auto-create wallet on approval:", walletErr);
            }

            // Log action in audit trail
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: adminUser.userId,
                    action: "DRIVER_APPROVED",
                    details: JSON.stringify({
                        driverName: profile.user.name,
                        driverEmail: profile.user.email,
                        driverProfileId: profile.id,
                        approvedBy: reviewerIdentifier,
                        timestamp: new Date().toISOString()
                    })
                }
            }).catch(() => {});

            // Invalidate caches
            try {
                memoryCache.delete("admin_drivers_list");
                memoryCache.delete(SIGNUPS_CACHE_KEY);
            } catch {}

            // Broadcast real-time approval to the driver
            try {
                rideStreamManager.publish({
                    type: "DRIVER_APPROVAL_UPDATED",
                    driverId: profile.id,
                    data: {
                        userId: profile.userId,
                        driverProfileId: profile.id,
                        approvalStatus: "APPROVED",
                        rejectionReason: null,
                        message: "Your driver registration has been approved! You can now go online and accept rides."
                    },
                    timestamp: new Date().toISOString()
                });
            } catch {}

            return NextResponse.json({
                success: true,
                message: `Driver ${profile.user.name || profile.user.email} has been approved successfully.`,
                application: {
                    id: profile.userId,
                    driverProfileId: profile.id,
                    approvalStatus: "APPROVED",
                    reviewedAt: updated.reviewedAt,
                    reviewedBy: updated.reviewedBy
                }
            });
        }

        if (action === "REJECT") {
            const rejectionReason = reason?.trim() || "Registration requirements or documentation were insufficient.";

            const updated = await prisma.driverProfile.update({
                where: { id: profile.id },
                data: {
                    approvalStatus: "REJECTED",
                    rejectionReason,
                    reviewedAt: new Date(),
                    reviewedBy: reviewerIdentifier,
                    isOnline: false, // Force driver offline
                },
                include: { user: true }
            });

            // Log action in audit trail
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: adminUser.userId,
                    action: "DRIVER_REJECTED",
                    details: JSON.stringify({
                        driverName: profile.user.name,
                        driverEmail: profile.user.email,
                        driverProfileId: profile.id,
                        rejectedBy: reviewerIdentifier,
                        reason: rejectionReason,
                        timestamp: new Date().toISOString()
                    })
                }
            }).catch(() => {});

            // Invalidate caches
            try {
                memoryCache.delete("admin_drivers_list");
                memoryCache.delete(SIGNUPS_CACHE_KEY);
            } catch {}

            // Broadcast real-time rejection to the driver
            try {
                rideStreamManager.publish({
                    type: "DRIVER_APPROVAL_UPDATED",
                    driverId: profile.id,
                    data: {
                        userId: profile.userId,
                        driverProfileId: profile.id,
                        approvalStatus: "REJECTED",
                        rejectionReason,
                        message: `Your driver application has been rejected: ${rejectionReason}`
                    },
                    timestamp: new Date().toISOString()
                });
            } catch {}

            return NextResponse.json({
                success: true,
                message: `Driver application rejected for ${profile.user.name || profile.user.email}.`,
                application: {
                    id: profile.userId,
                    driverProfileId: profile.id,
                    approvalStatus: "REJECTED",
                    rejectionReason,
                    reviewedAt: updated.reviewedAt,
                    reviewedBy: updated.reviewedBy
                }
            });
        }

        return NextResponse.json({ error: "Invalid action. Supported: APPROVE, REJECT" }, { status: 400 });
    } catch (error) {
        console.error("Admin driver approval action error:", error);
        return NextResponse.json({ error: "Failed to process driver action" }, { status: 500 });
    }
}
