const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  threadId: {
    type: String,
    required: true,
  },
  userMessage: {
    type: String,
    required: false,
  },
  botResponse: {
    type: String,
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

chatSchema.index({ userId: 1, threadId: 1 });


const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
