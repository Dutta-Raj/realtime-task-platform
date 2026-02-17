const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const listRoutes = require("./routes/listRoutes");
const taskRoutes = require("./routes/taskRoutes");

// Import middleware
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

// ========================
// CORS CONFIGURATION - COMPLETELY FIXED
// ========================
// Simple CORS - no wildcards
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://realtime-task-platform.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// No separate options handler - cors handles it

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://realtime-task-platform.netlify.app'],
    methods: ['GET', 'POST'],
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

// ========================
// TEST ROUTE
// ========================
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Test route working", timestamp: new Date().toISOString() });
});

// ========================
// ROUTES
// ========================
app.use("/api/auth", authRoutes);
app.use("/api/boards", authMiddleware, boardRoutes);
app.use("/api/lists", authMiddleware, listRoutes);
app.use("/api/tasks", authMiddleware, taskRoutes);

app.get("/api/socket-test", (req, res) => {
  res.json({ message: "Socket.IO is running", activeConnections: io.engine.clientsCount });
});

app.get("/", (req, res) => {
  res.json({
    message: "🚀 Real-Time Task Platform API",
    status: "running",
    endpoints: {
      test: "GET /api/test",
      auth: "POST /api/auth/signup, POST /api/auth/login",
      boards: "GET/POST /api/boards",
      lists: "GET/POST /api/lists",
      tasks: "GET/POST /api/tasks"
    }
  });
});

// ========================
// PRODUCTION STATIC FILES
// ========================
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  
  try {
    if (fs.existsSync(frontendDistPath)) {
      app.use(express.static(frontendDistPath));
      console.log("✅ Frontend static files will be served");
    } else {
      console.log("⚠️ Frontend dist not found - API-only mode");
    }
  } catch (err) {
    console.log("⚠️ Frontend files check failed - API-only mode");
  }
}

// ========================
// 404 HANDLER - SIMPLE
// ========================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ========================
// ERROR HANDLER
// ========================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ========================
// DATABASE CONNECTION
// ========================
const PORT = process.env.PORT || 5000;

console.log("🔄 Connecting to MongoDB...");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });