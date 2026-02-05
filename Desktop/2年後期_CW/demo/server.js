const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const os = require("os");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

function getLocalExternalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    // Use a separate port for WebSockets to avoid conflict with Next.js HMR
    const wss = new WebSocket.Server({ port: 3001 });

    const sessions = {}; // token => { pc, tablet }

    wss.on("connection", (ws, req) => {
        ws.on("message", (msg) => {
            try {
                const data = JSON.parse(msg);

                if (data.type === "register_pc") {
                    const token = crypto.randomBytes(4).toString("hex");
                    sessions[token] = { pc: ws, tablet: null };
                    ws.send(JSON.stringify({ type: "token", token, ip: getLocalExternalIP() }));
                }

                if (data.type === "register_tablet") {
                    const session = sessions[data.token];
                    if (!session) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
                        return;
                    }
                    session.tablet = ws;
                    // Notify Tablet
                    ws.send(JSON.stringify({ type: 'connection_success' }));
                    // Notify PC
                    if (session.pc) {
                        session.pc.send(JSON.stringify({ type: 'register_tablet_success' }));
                    }
                }

                if (["stroke_start", "stroke_move", "stroke_end", "resize", "undo", "redo"].includes(data.type)) {
                    const session = sessions[data.token];
                    if (session?.pc) {
                        session.pc.send(JSON.stringify(data));
                    }
                }
            } catch (e) {
                console.error("Error processing message:", e);
            }
        });
    });

    server.all(/.*/, (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(3000, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://${getLocalExternalIP()}:3000`);
        console.log(`> WebSocket Server on port 3001`);
    });
});

