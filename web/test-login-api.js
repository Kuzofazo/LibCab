// Native fetch is available in Node 18+


async function testLogin() {
    console.log('Testing login API...\n');

    const credentials = [
        { email: 'admin@paye.com', password: 'admin', label: 'Admin' },
        { email: 'driver@example.com', password: 'password123', label: 'Driver' },
    ];

    for (const cred of credentials) {
        console.log(`Testing ${cred.label} (${cred.email})...`);

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: cred.email,
                    password: cred.password
                })
            });

            const data = await response.json();

            console.log(`Status: ${response.status}`);
            console.log(`Response:`, data);
            console.log('---\n');
        } catch (error) {
            console.error(`Error: ${error.message}\n`);
        }
    }
}

testLogin();
