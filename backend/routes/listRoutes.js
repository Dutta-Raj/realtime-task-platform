const express = require("express");
const router = express.Router();
const List = require("../models/List");
const Board = require("../models/Board");
const Task = require("../models/Task");

// Get all lists for a board
router.get("/board/:boardId", async (req, res) => {
  try {
    const lists = await List.find({ board: req.params.boardId }).sort({ order: 1 });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new list
router.post("/", async (req, res) => {
  try {
    const { title, boardId, order } = req.body;
    
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: "Board not found" });
    
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const list = new List({
      title,
      board: boardId,
      order: order || 0
    });
    
    await list.save();
    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// ADD DELETE ROUTE - THIS IS MISSING
// ========================
router.delete("/:id", async (req, res) => {
  try {
    console.log("🗑️ Deleting list:", req.params.id);
    
    const list = await List.findById(req.params.id).populate("board");
    if (!list) {
      return res.status(404).json({ success: false, message: "List not found" });
    }
    
    const board = list.board;
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    // Delete all tasks in this list
    await Task.deleteMany({ list: req.params.id });
    
    // Delete the list
    await List.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: "List deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update list
router.put("/:id", async (req, res) => {
  try {
    const { title, order } = req.body;
    const list = await List.findById(req.params.id).populate("board");
    
    if (!list) return res.status(404).json({ message: "List not found" });
    
    const board = list.board;
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (title) list.title = title;
    if (order !== undefined) list.order = order;
    
    await list.save();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;