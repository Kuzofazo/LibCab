const BASE_URL = "http://localhost:3000";

async function runTests() {
    console.log("Debugging Tables...");
    const res = await fetch(`${BASE_URL}/api/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestPhone: "DEBUG" })
    });

    const data = await res.json();
    console.log("Tables:", JSON.stringify(data, null, 2));
}

runTests();
