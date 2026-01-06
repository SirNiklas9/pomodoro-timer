// Copyright 2025 SirNiklas9. All Rights Reserved.

import { file } from "bun";
import { ServerWebSocket } from "bun";

const clients = new Set<ServerWebSocket>();

interface Room {
    timeLeft: number;
    isRunning: boolean;
    mode: "work" | "break";
    clients: Set<ServerWebSocket<unknown>>;
}

let workTime = 25 * 60;
let breakTime = 3;

const rooms = new Map<string, Room>();
const socketToRoom = new Map<ServerWebSocket<unknown>, string>();

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

        if (url.pathname.startsWith("/images/")) {
            return new Response(file("./public" + url.pathname), {
                headers: { "Content-Type": "image/png" },
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
            const data = JSON.parse(message.toString());

            if (data.type === "join") {
                const room = getOrCreateRoom(data.username);
                room.clients.add(ws);
                socketToRoom.set(ws, data.username);
                // Send current state to the new client
                ws.send(JSON.stringify({ type: "tick", time: room.timeLeft, mode: room.mode }));
                return;
            }

            // Get this socket's room
            const roomName = socketToRoom.get(ws);
            if (!roomName) return;
            const room = rooms.get(roomName)!;

            if (data.type === "start") {
                room.isRunning = true;
            } else if (data.type === "stop") {
                room.isRunning = false;
            } else if (data.type == "reset") {
                room.timeLeft = room.mode == "work" ? workTime : breakTime;
                room.isRunning = false;
                broadcastToRoom(room);
            } else if (data.type == "mode") {
                room.mode = data.mode;
                room.timeLeft = room.mode == "work" ? workTime : breakTime;
                room.isRunning = false;
                broadcastToRoom(room);
            }
        },

        close(ws) {
            const roomName = socketToRoom.get(ws);
            if (roomName) {
                const room = rooms.get(roomName);
                if (room) {
                    room.clients.delete(ws);
                }
                socketToRoom.delete(ws);
            }
        },
    },
});

// Broadcast to all connected clients
function broadcastToRoom(room: Room) {
    // Keep track of clients
    for (const client of room.clients) {
        client.send(JSON.stringify({ type: "tick", time: room.timeLeft, mode: room.mode }));
    }
}

function getOrCreateRoom(username: string): Room {
    if (!rooms.has(username)) {
        rooms.set(username, {
            timeLeft: 25 * 60,
            isRunning: false,
            mode: "work",
            clients: new Set(),
        });
    }
    return rooms.get(username)!;
}

// Timer Tick
setInterval(() => {
    for (const room of rooms.values()) {
        if (room.isRunning && room.timeLeft > 0) {
            room.timeLeft--;
            broadcastToRoom(room);
        }
    }
}, 1000);

console.log(`Listening on http://0.0.0.0:${server.port}`);