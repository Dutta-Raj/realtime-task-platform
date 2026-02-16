const express = require("express");
const router = express.Router();
const Board = require("../models/Board");

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Board routes working" });
});

// Create board
router.post("/", async (req, res) => {
  try {
    const { title, description, background } = req.body;
    
    const board = new Board({
      title,
      description,
      background: background || "#0079bf",
      owner: req.user.id,
      members: [req.user.id]
    });
    
    await board.save();
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all boards
router.get("/", async (req, res) => {
  try {
    const boards = await Board.find({ members: req.user.id })
      .populate("owner", "name email");
    res.json(boards);
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

module.exports = router;