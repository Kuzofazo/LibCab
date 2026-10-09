const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearTestData() {
    console.log("Starting full data cleanup for fresh test...");

    try {
        // 1. Delete dependent records first
        const reviewCount = await prisma.review.deleteMany({});
        console.log(`- Deleted ${reviewCount.count} reviews.`);

        const paymentCount = await prisma.paymentTransaction.deleteMany({});
        console.log(`- Deleted ${paymentCount.count} payment transactions.`);

        // 2. Delete main ride records
        const rideCount = await prisma.ride.deleteMany({});
        console.log(`- Deleted ${rideCount.count} rides (history and requests).`);

        // 3. Clear logs and other test data
        const logCount = await prisma.dispatcherLog.deleteMany({});
        console.log(`- Deleted ${logCount.count} dispatcher logs.`);

        const sessionCount = await prisma.guestSession.deleteMany({});
        console.log(`- Deleted ${sessionCount.count} guest sessions.`);

        const complaintCount = await prisma.complaint.deleteMany({});
        console.log(`- Deleted ${complaintCount.count} complaints.`);

        const announcementCount = await prisma.announcement.deleteMany({});
        console.log(`- Deleted ${announcementCount.count} announcements.`);

        const insightCount = await prisma.systemInsight.deleteMany({});
        console.log(`- Deleted ${insightCount.count} system insights.`);

        const metricCount = await prisma.performanceMetric.deleteMany({});
        console.log(`- Deleted ${metricCount.count} performance metrics.`);

        // 4. Reset Driver States
        const driverReset = await prisma.driverProfile.updateMany({
            data: {
                isOnline: false,
                currentLat: null,
                currentLng: null,
                rating: 5.0,
                reviewCount: 0
            }
        });
        console.log(`- Reset ${driverReset.count} driver profiles (offline, coords cleared, rating reset).`);

        console.log("\nCleanup successfully completed! Ready for fresh tests.");
    } catch (error) {
        console.error("\nERROR during cleanup:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearTestData();
