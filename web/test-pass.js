const { Client } = require('pg');

const passwords = ['postgres', 'admin', 'password', '', 'root', 'enterprisedb', 'dbpass', 'paye', 'africab'];
const ports = [5432, 5433, 5444];
const users = ['postgres', 'enterprisedb', 'admin', 'root'];
const db = 'postgres';

async function testAll() {
    for (const port of ports) {
        for (const user of users) {
            for (const password of passwords) {
                console.log(`Testing port ${port} | user: ${user} | password: "${password}"`);
                const client = new Client({
                    user,
                    host: '127.0.0.1',
                    database: db,
                    password,
                    port,
                });

                try {
                    await client.connect();
                    console.log(`\n!!! SUCCESS: Connected to port ${port} as ${user} with password "${password}" !!!\n`);
                    await client.end();
                    return;
                } catch (err) {
                    console.log(`Failed: ${err.message}`);
                }
            }
        }
    }
}

testAll();
