const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Admin@123@127.0.0.1:5432/postgres';

async function createDb() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        await client.query('CREATE DATABASE paye_logistic');
        console.log('SUCCESS: Database paye_logistic created!');
    } catch (err) {
        if (err.code === '42P04') {
            console.log('Database paye_logistic already exists.');
        } else {
            console.error('Failed:', err.message);
        }
    } finally {
        await client.end();
    }
}

createDb();
