const express = require("express");
const router = express.Router();
const Board = require("../models/Board");

// Get all boards
router.get("/", async (req, res) => {
  try {
    const boards = await Board.find({ members: req.user.id })
      .populate("owner", "name email")
      .populate("members", "name email");
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create board
router.post("/", async (req, res) => {
  try {
    const { title, description, background } = req.body;
    const board = new Board({
      title,
      description: description || "",
      background: background || "#3b82f6",
      owner: req.user.id,
      members: [req.user.id]
    });
    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single board
router.get("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members", "name email");
    
    if (!board) return res.status(404).json({ message: "Board not found" });
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
    if (!board) return res.status(404).json({ message: "Board not found" });
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
// DELETE BOARD - ADD THIS
// ========================
router.delete("/:id", async (req, res) => {
  try {
    console.log("🗑️ DELETE request for board:", req.params.id);
    
    const board = await Board.findById(req.params.id);
    
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    
    // Check if user is owner
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can delete" });
    }
    
    await Board.findByIdAndDelete(req.params.id);
    res.json({ message: "Board deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;