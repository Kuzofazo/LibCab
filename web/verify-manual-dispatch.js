const BASE_URL = "http://localhost:3000";

async function runTests() {
    console.log("Starting Manual Dispatch Verification...");

    // Simulate Dispatcher manually booking for a guest
    const manualRide = {
        guestPhone: "077-MANUAL-01",
        originAddress: "Manual Dispatch Origin",
        destAddress: "Manual Dispatch Dest",
        payment: "CASH"
    };

    console.log("Testing Create Manual Ride...");
    const res = await fetch(`${BASE_URL}/api/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualRide)
    });

    if (!res.ok) {
        console.error("❌ Manual Dispatch Failed:", await res.text());
        return;
    }

    const ride = await res.json();
    console.log("✅ Manual Ride Created:", ride);

    if (ride.guestPhone === manualRide.guestPhone && ride.status === "REQUESTED") {
        console.log("Verified Ride Data Correct");
    } else {
        console.error("❌ Ride Data Mismatch");
    }
}

runTests();
