const express = require("express");
const router = express.Router();
const List = require("../models/List");
const Board = require("../models/Board");

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "List routes working" });
});

// Create list
router.post("/", async (req, res) => {
  try {
    const { title, boardId, order } = req.body;
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    
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

// Get lists by board
router.get("/board/:boardId", async (req, res) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }
    
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const lists = await List.find({ board: req.params.boardId }).sort({ order: 1 });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;