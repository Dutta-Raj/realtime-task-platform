const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const listRoutes = require("./routes/listRoutes");
const taskRoutes = require("./routes/taskRoutes");

// Import middleware
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO setup
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);
  socket.on("join-board", (boardId) => socket.join(boardId));
  socket.on("leave-board", (boardId) => socket.leave(boardId));
  socket.on("disconnect", () => console.log("🔌 Client disconnected:", socket.id));
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API is working" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/boards", authMiddleware, boardRoutes);
app.use("/api/lists", authMiddleware, listRoutes);
app.use("/api/tasks", authMiddleware, taskRoutes);

// Socket test
app.get("/api/socket-test", (req, res) => {
  res.json({ message: "Socket.IO running", connections: io.engine.clientsCount });
});

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow API",
    status: "running",
    endpoints: {
      test: "/api/test",
      auth: "/api/auth",
      boards: "/api/boards",
      lists: "/api/lists",
      tasks: "/api/tasks"
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

// Database connection
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.log("❌ MongoDB Error:", err);
    process.exit(1);
  });