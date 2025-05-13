// models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  html: String,
  css: String,
  js: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);