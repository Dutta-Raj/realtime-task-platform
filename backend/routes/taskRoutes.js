const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const List = require("../models/List");
const Board = require("../models/Board");
const Activity = require("../models/Activity");

// Get tasks by list
router.get("/list/:listId", async (req, res) => {
  try {
    const tasks = await Task.find({ list: req.params.listId })
      .sort({ order: 1 })
      .populate("assignedTo", "name email");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    
    // Log activity
    await Activity.create({
      action: `Created task "${title}"`,
      user: req.user.id,
      board: board._id,
      list: listId,
      task: task._id
    });
    
    res.status(201).json(task);
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
    
    const oldTitle = task.title;
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (listId) task.list = listId;
    if (order !== undefined) task.order = order;
    if (assignedTo) task.assignedTo = assignedTo;
    
    await task.save();
    
    // Log activity
    await Activity.create({
      action: `Updated task "${title || oldTitle}"`,
      user: req.user.id,
      board: board._id,
      list: task.list._id,
      task: task._id
    });
    
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
    
    const taskTitle = task.title;
    await Task.findByIdAndDelete(req.params.id);
    
    // Log activity
    await Activity.create({
      action: `Deleted task "${taskTitle}"`,
      user: req.user.id,
      board: board._id,
      list: task.list._id
    });
    
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;