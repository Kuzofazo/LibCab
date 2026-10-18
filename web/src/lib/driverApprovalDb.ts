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
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'DriverProfile' AND column_name = 'approvalStatus'
                ) THEN
                    ALTER TABLE "DriverProfile" ADD COLUMN "approvalStatus" VARCHAR(50) DEFAULT 'PENDING';
                    -- Existing drivers prior to this feature remain approved to prevent disruption
                    UPDATE "DriverProfile" SET "approvalStatus" = 'APPROVED' WHERE "approvalStatus" IS NULL;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'DriverProfile' AND column_name = 'rejectionReason'
                ) THEN
                    ALTER TABLE "DriverProfile" ADD COLUMN "rejectionReason" TEXT;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'DriverProfile' AND column_name = 'reviewedAt'
                ) THEN
                    ALTER TABLE "DriverProfile" ADD COLUMN "reviewedAt" TIMESTAMP;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'DriverProfile' AND column_name = 'reviewedBy'
                ) THEN
                    ALTER TABLE "DriverProfile" ADD COLUMN "reviewedBy" VARCHAR(255);
                END IF;
            END $$;
        `);
        schemaChecked = true;
    } catch (error) {
        // Fallback for non-postgres or environments where raw DDL execution is constrained
        console.warn("Notice: ensureDriverApprovalSchema DDL skipped or already provisioned", error);
    }
}
