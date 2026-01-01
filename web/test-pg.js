const { Client } = require('pg');

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:5432/paye_logistic';

async function test() {
    console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':****@'));
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('SUCCESS: Authenticated and connected via pg!');
        const res = await client.query('SELECT current_database(), current_user, version()');
        console.log('Result:', res.rows[0]);
    } catch (err) {
        console.error('FAILURE: Could not connect via pg');
        console.error('Error:', err.message);
        console.error('Code:', err.code);
    } finally {
        await client.end();
    }
}

test();
