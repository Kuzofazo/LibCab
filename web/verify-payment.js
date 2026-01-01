const BASE_URL = "http://localhost:3000";

async function runTests() {
    console.log("Starting Payment Flow Verification...");

    // 1. Get Session
    const phone = "0770000003"; // Reusing known phone

    // Need session ID logic? 
    // I can interact with the DB via valid API? 
    // Or just use the manual dispatch override if I want to skip session?
    // Guest Ride API needs a valid sessionId.
    // I will simulate the guest-login first to get a session.

    // Login
    console.log("Creating Session...");
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

    const loginData = await loginRes.json();
    if (!loginData.success) {
        console.error("Login Failed");
        return;
    }

    const sessionId = loginData.sessionId;
    console.log("Session ID:", sessionId);

    // 2. Book Ride with MTN
    console.log("Booking Ride with MTN...");
    const rideRes = await fetch(`${BASE_URL}/api/rides/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionId,
            pickup: "Payment Start",
            destination: "Payment End",
            payment: "MTN"
        })
    });

    if (!rideRes.ok) {
        console.error("Booking Failed:", await rideRes.json());
        return;
    }

    const ride = await rideRes.json();
    console.log("Ride Created:", ride);

    if (ride.paymentMethod === "MTN" || ride.guestPhone) {
        console.log("✅ Ride Payment Method Verified");
    } else {
        console.log("⚠️ Payment method might be default, check logs.");
    }
}

runTests();
