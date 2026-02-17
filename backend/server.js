const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
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
// FIXED CORS CONFIGURATION - NO WILDCARDS
// ========================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://realtime-task-platform.netlify.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// DO NOT USE app.options('*', cors()) - THIS CAUSES THE ERROR
// Remove that line completely

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
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