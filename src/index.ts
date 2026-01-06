// Copyright 2025 SirNiklas9. All Rights Reserved.

const server = Bun.serve({
    port: 3000,
    fetch(req, server) {
        if (server.upgrade(req)) {
            return;
        }
        return new Response("Pomodoro Timer Server");
    },
    websocket: {
        open(ws) {
            console.log("Client Connected");
        },
        message(ws, message) {
            console.log("Received: " + message);
        },
        close(ws) {
            console.log("Client Disconnected");
        },
    },
});

console.log(`Listening on http://localhost:${server.port}`);