const express = require("express");
const router = express.Router();
const Board = require("../models/Board");

// Get all boards
router.get("/", async (req, res) => {
  try {
    console.log("📋 Fetching boards for user:", req.user.id);
    const boards = await Board.find({ members: req.user.id })
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${boards.length} boards`);
    res.json(boards);
  } catch (err) {
    console.error("❌ Error fetching boards:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create board
router.post("/", async (req, res) => {
  try {
    console.log("➕ Creating board for user:", req.user.id);
    const { title, description, background } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const board = new Board({
      title,
      description: description || "",
      background: background || "#3b82f6",
      owner: req.user.id,
      members: [req.user.id]
    });

    await board.save();
    console.log("✅ Board created with ID:", board._id);
    res.status(201).json(board);
  } catch (err) {
    console.error("❌ Error creating board:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single board
router.get("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (!board.members.some(m => m._id.toString() === req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update board
router.put("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can update" });
    }

    const { title, description, background } = req.body;
    if (title) board.title = title;
    if (description !== undefined) board.description = description;
    if (background) board.background = background;

    await board.save();
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// DELETE BOARD - FIXED VERSION
// ========================
router.delete("/:id", async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("🗑️ DELETE REQUEST RECEIVED");
    console.log("Board ID:", req.params.id);
    console.log("User ID:", req.user.id);
    console.log("=".repeat(50));

    // Find the board
    const board = await Board.findById(req.params.id);

    if (!board) {
      console.log("❌ Board not found in database");
      return res.status(404).json({ 
        success: false,
        message: "Board not found" 
      });
    }

    console.log("✅ Board found:", board.title);
    console.log("Board owner:", board.owner.toString());
    console.log("Request user:", req.user.id);

    // Check if user is owner
    if (board.owner.toString() !== req.user.id) {
      console.log("❌ Authorization failed - user is not owner");
      return res.status(403).json({ 
        success: false,
        message: "Only the owner can delete this board"
      });
    }

    console.log("✅ Authorization successful - user is owner");

    // Delete the board
    await Board.findByIdAndDelete(req.params.id);
    console.log("✅ Board deleted successfully from database");

    res.json({ 
      success: true,
      message: "Board deleted successfully"
    });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete board",
      error: err.message 
    });
  }
});

module.exports = router;