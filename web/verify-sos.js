const BASE_URL = "http://localhost:3000";

async function runTests() {
    console.log("Starting SOS Verification...");

    // 1. Create a ride to test with (Guest Ride)
    const phone = "077-SOS-TEST";

    // Login to get session
    await fetch(`${BASE_URL}/api/auth/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    });
    const loginRes = await fetch(`${BASE_URL}/api/auth/guest-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: "1234" })
    });
    const session = await loginRes.json();

    // Book Ride
    const rideRes = await fetch(`${BASE_URL}/api/rides/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionId: session.sessionId,
            pickup: "SOS Start",
            destination: "SOS End",
            payment: "CASH"
        })
    });
    const ride = await rideRes.json();
    console.log("Test Ride Created:", ride.id);

    // 2. Trigger SOS
    console.log("Triggering SOS...");
    const sosRes = await fetch(`${BASE_URL}/api/rides/${ride.id}/sos`, {
        method: "POST"
    });

    if (!sosRes.ok) {
        console.error("SOS Failed:", await sosRes.text());
        return;
    }

    const sosData = await sosRes.json();
    console.log("✅ SOS Result:", sosData);
}

runTests();
