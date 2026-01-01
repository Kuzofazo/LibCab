

async function test() {
    try {
        console.log("Fetching http://localhost:3000/api/admin/drivers...");
        const res = await fetch("http://localhost:3000/api/admin/drivers");
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data length:", Array.isArray(data) ? data.length : "Not an array");
        // console.log("Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}

test();
