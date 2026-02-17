const express = require("express");
const router = express.Router();
const Board = require("../models/Board");
const List = require("../models/List");
const Task = require("../models/Task");
const Activity = require("../models/Activity");

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
    
    // Log activity
    await Activity.create({
      action: `Created board "${title}"`,
      user: req.user.id,
      board: board._id
    });
    
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
    
    // Log activity
    await Activity.create({
      action: `Updated board "${board.title}"`,
      user: req.user.id,
      board: board._id
    });
    
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete board
router.delete("/:id", async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owner can delete" });
    }
    
    // Log activity before deleting
    await Activity.create({
      action: `Deleted board "${board.title}"`,
      user: req.user.id,
      board: board._id
    });
    
    await Board.findByIdAndDelete(req.params.id);
    res.json({ message: "Board deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// ACTIVITY HISTORY ROUTE
// ========================
router.get("/:id/activity", async (req, res) => {
  try {
    const boardId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    console.log("📋 Fetching activities for board:", boardId);
    
    // Get activities from database
    const activities = await Activity.find({ board: boardId })
      .populate("user", "name email")
      .sort({ timestamp: -1 }) // Newest first
      .skip(skip)
      .limit(limit);
    
    const total = await Activity.countDocuments({ board: boardId });
    
    res.json({
      success: true,
      activities,
      hasMore: total > skip + activities.length,
      page,
      limit,
      total
    });
  } catch (err) {
    console.error("❌ Error fetching activities:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;