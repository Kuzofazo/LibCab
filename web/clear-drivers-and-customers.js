const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function performClear(dbUrl, label) {
    console.log(`\n========================================`);
    console.log(`Starting cleanup for ${label} (${dbUrl || 'default env'})...`);
    console.log(`========================================`);

    const prisma = new PrismaClient(
        dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
    );

    try {
        await prisma.$connect();

        // 1. Delete dependent transactional records
        const deletedReviews = await prisma.review.deleteMany({});
        console.log(`✓ Deleted ${deletedReviews.count} reviews.`);

        const deletedPayments = await prisma.paymentTransaction.deleteMany({});
        console.log(`✓ Deleted ${deletedPayments.count} payment transactions.`);

        const deletedLogs = await prisma.locationLog.deleteMany({});
        console.log(`✓ Deleted ${deletedLogs.count} location logs.`);

        const deletedTelemetry = await prisma.telemetryLog.deleteMany({});
        console.log(`✓ Deleted ${deletedTelemetry.count} telemetry logs.`);

        const deletedRides = await prisma.ride.deleteMany({});
        console.log(`✓ Deleted ${deletedRides.count} ride records.`);

        const deletedComplaints = await prisma.complaint.deleteMany({});
        console.log(`✓ Deleted ${deletedComplaints.count} complaints.`);

        const deletedDispatcherLogs = await prisma.dispatcherLog.deleteMany({});
        console.log(`✓ Deleted ${deletedDispatcherLogs.count} dispatcher logs.`);

        const deletedGuestSessions = await prisma.guestSession.deleteMany({});
        console.log(`✓ Deleted ${deletedGuestSessions.count} guest sessions.`);

        // 2. Delete driver profiles
        const deletedDriverProfiles = await prisma.driverProfile.deleteMany({});
        console.log(`✓ Deleted ${deletedDriverProfiles.count} driver profiles.`);

        // 3. Delete Driver and Customer/Rider User accounts (preserve Admin / Super Admin)
        const deletedCustomersAndDrivers = await prisma.user.deleteMany({
            where: {
                role: {
                    in: ['DRIVER', 'RIDER']
                }
            }
        });
        console.log(`✓ Deleted ${deletedCustomersAndDrivers.count} customer and driver user accounts.`);

        // Check remaining users (Admins/Staff)
        const remainingUsers = await prisma.user.findMany({
            select: { id: true, email: true, role: true, name: true }
        });
        console.log(`ℹ Remaining administrative accounts: ${remainingUsers.length}`);
        if (remainingUsers.length > 0) {
            console.log(remainingUsers);
        }

        console.log(`\n🎉 Successfully cleared all driver and customer records for ${label}!`);
    } catch (err) {
        console.error(`❌ Error during cleanup on ${label}:`, err.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    // Run on default DB
    await performClear(undefined, 'Default DB (web/.env)');

    // Also run on explicit prisma/dev.db if file exists
    const devDbPath = path.resolve(__dirname, 'prisma/dev.db').replace(/\\/g, '/');
    await performClear(`file:${devDbPath}`, 'prisma/dev.db');
}

main().catch(console.error);
