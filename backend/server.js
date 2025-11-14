const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/auth.routes");
const leadsRoutesFactory = require("./src/routes/leads.routes");       // NOTE: change to factory
const activitiesRoutesFactory = require("./src/routes/activities.routes"); // NOTE: change to factory

const analyticsRoutes = require("./src/routes/analytics.routes");
const usersRoutes = require("./src/routes/users.routes");
const logsRoutes = require("./src/routes/logs.routes");


const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- socket.io setup ---
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", ({ userId }) => {
    console.log("JOIN request from socket", socket.id, "userId:", userId);
    if (userId) {
      socket.join(`user:${userId}`);
      console.log("Rooms for socket", socket.id, "→", [...socket.rooms]);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});


app.use("/api/auth", authRoutes);

app.use("/api/leads", leadsRoutesFactory(io));
app.use("/api/activities", activitiesRoutesFactory(io));

app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/logs", logsRoutes);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`API + WS on http://localhost:${PORT}`));
