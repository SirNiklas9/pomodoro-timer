// Copyright 2025 SirNiklas9. All Rights Reserved.

import { file } from "bun";
import { ServerWebSocket } from "bun";

const clients = new Set<ServerWebSocket>();

let isRunning = false;

let mode: "work" | "break" = "work";
let workTime = 25 * 60;
let breakTime = 5 * 60;
let timeLeft = workTime // 25 minutes in seconds

const server = Bun.serve({
    port: 3000,
    hostname: "0.0.0.0",
    fetch(req, server) {
        const url = new URL(req.url)

        if (server.upgrade(req)) {
            return;
        }

        if (url.pathname == "/style.css") {
            return new Response(file("./public/style.css"), {
                headers: { "Content-Type": "text/css" },
            });
        }

        if (url.pathname.startsWith("/sounds/")) {
            return new Response(file("./public" + url.pathname), {
                headers: { "Content-Type": "audio/mpeg" },
            });
        }

        return new Response(file("./public/index.html"), {
            headers: {"content-type": "text/html",},
        });
    },
    websocket: {
        open(ws) {
            clients.add(ws);
            console.log("Client Connected");
        },
        message(ws, message) {
            console.log("Message Received", message.toString());
            const data = JSON.parse(message.toString());
            console.log("data.type is:", data.type);
            console.log("Checking mode:", data.type === "mode");
            if (data.type === "start") {
                isRunning = true;
            } else if (data.type === "stop") {
                isRunning = false;
            } else if (data.type == "reset") {
                timeLeft = mode == "work" ? workTime : breakTime;
                isRunning = false;
                broadcast(JSON.stringify({type: "tick", time: timeLeft}));
            } else if (data.type == "mode") {
                mode = data.mode;
                timeLeft = mode == "work" ? workTime : breakTime;
                isRunning = false;
                console.log("Broadcast");
                broadcast(JSON.stringify({ type: "tick", time: timeLeft, mode: mode}));
            }
        },
        close(ws) {
            clients.delete(ws);
            console.log("Client Disconnected");
        },
    },
});

// Broadcast to all connected clients
function broadcast(message: string) {
    // Keep track of clients
    for (const client of clients) {
        client.send(message);
    }
}

// Timer Tick
setInterval(() => {
    console.log("Tick - isRunning:", isRunning, "timeLeft:", timeLeft);
    if (isRunning && timeLeft > 0) {
        timeLeft--;
        broadcast(JSON.stringify({type: "tick", time: timeLeft, mode: mode}));
    }
}, 1000);

console.log(`Listening on http://localhost:${server.port}`);