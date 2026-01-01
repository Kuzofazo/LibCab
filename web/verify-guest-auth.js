const BASE_URL = "http://localhost:3000";

async function runTests() {
    console.log("Starting Guest Auth Verification...");
    const phone = "0770000003";

    // 1. Request OTP
    console.log("Testing Request OTP...");
    const otpRes = await fetch(`${BASE_URL}/api/auth/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    });

    if (!otpRes.ok) {
        console.error("❌ Request OTP Failed:", await otpRes.text());
        return;
    }
    console.log("✅ OTP Requested");

    // 2. Verify OTP
    console.log("Testing Verify OTP...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/guest-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: "1234" })
    });

    if (!loginRes.ok) {
        console.error("❌ Login Failed:", await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    console.log("✅ Guest Login Success:", loginData);

    if (loginData.success && loginData.sessionId) {
        console.log("Verified Session ID:", loginData.sessionId);
    } else {
        console.error("❌ Invalid Login Response");
    }
}

runTests();
