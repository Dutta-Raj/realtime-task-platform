const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs"); // Added for file system operations
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const listRoutes = require("./routes/listRoutes");
const taskRoutes = require("./routes/taskRoutes");

// Import middleware
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Make io accessible to routes
app.set("io", io);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("join-board", (boardId) => {
    socket.join(boardId);
    console.log(`Client ${socket.id} joined board: ${boardId}`);
  });

  socket.on("leave-board", (boardId) => {
    socket.leave(boardId);
    console.log(`Client ${socket.id} left board: ${boardId}`);
  });

  socket.on("task-updated", (data) => {
    socket.to(data.boardId).emit("task-updated", data);
  });

  socket.on("task-created", (data) => {
    socket.to(data.boardId).emit("task-created", data);
  });

  socket.on("task-deleted", (data) => {
    socket.to(data.boardId).emit("task-deleted", data);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// ========================
// TEST ROUTE
// ========================
app.get("/api/test", (req, res) => {
  console.log("✅ Test route hit!");
  res.json({ 
    success: true, 
    message: "Test route working perfectly",
    timestamp: new Date().toISOString()
  });
});

// ========================
// PUBLIC ROUTES
// ========================
app.use("/api/auth", authRoutes);

// ========================
// PROTECTED ROUTES
// ========================
app.use("/api/boards", authMiddleware, boardRoutes);
app.use("/api/lists", authMiddleware, listRoutes);
app.use("/api/tasks", authMiddleware, taskRoutes);

// ========================
// SOCKET TEST ROUTE
// ========================
app.get("/api/socket-test", (req, res) => {
  res.json({
    message: "Socket.IO is running",
    activeConnections: io.engine.clientsCount
  });
});

// ========================
// HOME ROUTE
// ========================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Real-Time Task Platform API",
    status: "running",
    socketIO: "connected",
    activeConnections: io.engine.clientsCount,
    endpoints: {
      test: "GET /api/test",
      socketTest: "GET /api/socket-test",
      auth: "POST /api/auth/signup, POST /api/auth/login",
      boards: "GET/POST /api/boards",
      lists: "GET/POST /api/lists",
      tasks: "GET/POST /api/tasks"
    }
  });
});

// ========================
// SERVE STATIC ASSETS IN PRODUCTION - FIXED VERSION
// ========================
if (process.env.NODE_ENV === 'production') {
  // Define path to frontend dist folder
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  
  // Check if frontend dist exists
  try {
    if (fs.existsSync(frontendDistPath)) {
      // Serve static files from the frontend dist directory
      app.use(express.static(frontendDistPath));
      
      // For any route not matching /api, serve the index.html
      // This uses a regex to match all routes except those starting with /api
      app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      });
      
      console.log("✅ Frontend static files will be served from:", frontendDistPath);
    } else {
      console.log("⚠️ Frontend dist folder not found at:", frontendDistPath);
      console.log("⚠️ Running in API-only mode. Frontend must be deployed separately.");
    }
  } catch (err) {
    console.log("⚠️ Could not check for frontend files - running in API-only mode");
  }
}

// ========================
// 404 HANDLER - Must come after all routes
// ========================
app.use((req, res) => {
  // Don't return 404 for frontend routes in production if we're in API-only mode
  if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api')) {
    // In API-only mode, just return a message instead of 404
    return res.status(200).json({ 
      message: "Backend API is running. Frontend is deployed separately.",
      backendUrl: "https://realtime-task-platform.onrender.com",
      frontendUrl: "https://realtime-task-platform.vercel.app (if deployed)"
    });
  }
  
  res.status(404).json({ 
    message: "Route not found",
    method: req.method,
    path: req.originalUrl
  });
});

// ========================
// ERROR HANDLER
// ========================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).json({ 
    message: "Internal server error",
    error: err.message 
  });
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
      console.log(`📍 Test route: http://localhost:${PORT}/api/test`);
      console.log(`📍 Socket test: http://localhost:${PORT}/api/socket-test`);
      console.log(`📍 Health check: https://realtime-task-platform.onrender.com/api/test`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });