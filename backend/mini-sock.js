const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });

io.on("connection", (socket) => {
  console.log("Mini connected:", socket.id);
});

server.listen(3000, () => console.log("Mini API + WS on http://localhost:3000"));
