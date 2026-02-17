const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    required: true
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "List"
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task"
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Activity", activitySchema);