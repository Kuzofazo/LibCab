const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Admin@123@127.0.0.1:5432/postgres';

async function listDbs() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('Available databases:', res.rows.map(r => r.datname));
    } catch (err) {
        console.error('Failed:', err.message);
    } finally {
        await client.end();
    }
}

listDbs();
