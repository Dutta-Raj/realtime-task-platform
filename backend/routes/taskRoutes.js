const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const List = require("../models/List");
const Board = require("../models/Board");

// Helper to get Socket.IO instance
const getIO = (req) => req.app.get("io");

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Task routes working" });
});

// Create task
router.post("/", async (req, res) => {
  try {
    const { title, description, listId, boardId, order } = req.body;
    
    const list = await List.findById(listId).populate("board");
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    
    const board = list.board;
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const task = new Task({
      title,
      description,
      list: listId,
      board: boardId || list.board._id,
      order: order || 0
    });
    
    await task.save();
    
    // Emit real-time event
    const io = getIO(req);
    io.to(task.board.toString()).emit("task-created", task);
    
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks by list
router.get("/list/:listId", async (req, res) => {
  try {
    const list = await List.findById(req.params.listId).populate("board");
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    
    const board = list.board;
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const tasks = await Task.find({ list: req.params.listId })
      .sort({ order: 1 })
      .populate("assignedTo", "name email");
    
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put("/:id", async (req, res) => {
  try {
    const { title, description, listId, order, assignedTo } = req.body;
    const task = await Task.findById(req.params.id).populate({
      path: "list",
      populate: { path: "board" }
    });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    const board = task.list.board;
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (listId) task.list = listId;
    if (order !== undefined) task.order = order;
    if (assignedTo) task.assignedTo = assignedTo;
    
    await task.save();
    
    // Emit real-time event
    const io = getIO(req);
    io.to(task.board.toString()).emit("task-updated", task);
    
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate({
      path: "list",
      populate: { path: "board" }
    });
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    const board = task.list.board;
    if (!board.members.includes(req.user.id)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    await task.deleteOne();
    
    // Emit real-time event
    const io = getIO(req);
    io.to(task.board.toString()).emit("task-deleted", { 
      id: req.params.id, 
      boardId: task.board 
    });
    
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;