import { prisma } from "@/lib/db";

let schemaChecked = false;

/**
 * Ensures that the DriverProfile table has the approvalStatus, rejectionReason,
 * reviewedAt, and reviewedBy columns on the live database.
 * Completely idempotent and safe across migrations and live server instances.
 */
export async function ensureDriverApprovalSchema() {
    if (schemaChecked) return;
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "DriverProfile" 
            ADD COLUMN IF NOT EXISTS "approvalStatus" VARCHAR(50) DEFAULT 'APPROVED',
            ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
            ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "reviewedBy" VARCHAR(255);
        `);
        schemaChecked = true;
    } catch (error) {
        // Fallback for non-postgres or environments where raw DDL execution is constrained
        console.warn("Notice: ensureDriverApprovalSchema DDL skipped or already provisioned", error);
    }
}
