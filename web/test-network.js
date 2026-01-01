const net = require('net');

const ports = [5432, 5433, 5444];
const host = '127.0.0.1';

ports.forEach(port => {
    const socket = new net.Socket();

    socket.setTimeout(2000);

    console.log(`Checking ${host}:${port}...`);

    socket.on('connect', () => {
        console.log(`SUCCESS: Connected to ${host}:${port}`);
        socket.destroy();
    });

    socket.on('timeout', () => {
        console.log(`TIMEOUT: Could not connect to ${host}:${port}`);
        socket.destroy();
    });

    socket.on('error', (err) => {
        console.log(`ERROR: ${host}:${port} - ${err.message}`);
    });

    socket.connect(port, host);
});
