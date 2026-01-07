// Copyright 2025 SirNiklas9. All Rights Reserved.

import { file } from "bun";
import { ServerWebSocket } from "bun";
import * as crypto from "node:crypto";

const clients = new Set<ServerWebSocket>();

interface Session {
    sessionCode: string;
    timeLeft: number;
    isRunning: boolean;
    mode: "work" | "break";
    clients: Set<ServerWebSocket<unknown>>;
}

let workTime = 25 * 60;
let breakTime = 5 * 60;

const sessions = new Map<string, Session>();
const socketToSession = new Map<ServerWebSocket<unknown>, string>();

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
        },

        message(ws, message) {
            const data = JSON.parse(message.toString());

            if (data.type === "create") {
                const session = createSession();
                session.clients.add(ws)
                socketToSession.set(ws, session.sessionCode);

                // send sessionCode back to client
                ws.send(JSON.stringify({ type: "created", sessionCode: session.sessionCode }));
            }

            if (data.type === "join") {
                const session = getSession(data.sessionCode);
                if (session) {
                    session.clients.add(ws);
                    socketToSession.set(ws, data.sessionCode);

                    // Send current state to the new client
                    broadcastToSession(session)
                } else {
                    ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
                }
                return;
            }

            // Get this socket's session
            const sessionName = socketToSession.get(ws);
            if (!sessionName) return;
            const session = sessions.get(sessionName)!;

            if (data.type === "start") {
                session.isRunning = true;
            } else if (data.type === "stop") {
                session.isRunning = false;
            } else if (data.type == "reset") {
                session.timeLeft = session.mode == "work" ? workTime : breakTime;
                session.isRunning = false;
                broadcastToSession(session);
            } else if (data.type === "toggleMode") {
                session.mode = session.mode === "work" ? "break" : "work";  // toggle on server
                session.timeLeft = session.mode == "work" ? workTime : breakTime;
                session.isRunning = false;
                broadcastToSession(session);
            }
        },

        close(ws) {
            const sessionName = socketToSession.get(ws);
            if (sessionName) {
                const session = sessions.get(sessionName);
                if (session) {
                    session.clients.delete(ws);
                    broadcastToSession(session);
                    if (session.clients.size === 0) {
                        // Delete after 5 minutes if still empty
                        setTimeout(() => {
                            if (session.clients.size === 0) {
                                sessions.delete(sessionName);
                            }
                        }, 5 * 60 * 1000);
                    }
                }
                socketToSession.delete(ws);
            }
        },
    },
});

// Broadcast to all connected clients
function broadcastToSession(session: Session) {
    // Keep track of clients
    for (const client of session.clients) {
        client.send(JSON.stringify({ type: "tick", time: session.timeLeft, mode: session.mode, userCount: session.clients.size}));
    }
}

function generateCode(length = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1/L confusion
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function createSession(): Session {
    let sessionCode = generateCode();

    // regenerate if collision (rare but possible)
    while (sessions.has(sessionCode)) {
        sessionCode = generateCode();
    }

    const session: Session = {
        sessionCode,
        timeLeft: 25 * 60,
        isRunning: false,
        mode: "work",
        clients: new Set()
    };
    sessions.set(sessionCode, session);
    return session;
}

function getSession(sessionCode: string): Session | undefined {
    return sessions.get(sessionCode);
}

// Timer Tick
setInterval(() => {
    for (const session of sessions.values()) {
        if (session.isRunning && session.timeLeft > 0) {
            session.timeLeft--;
            broadcastToSession(session);
        }
    }
}, 1000);

console.log(`Listening on http://0.0.0.0:${server.port}`);