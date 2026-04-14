const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  avatarUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true }); // adds createdAt and updatedAt automatically

module.exports = mongoose.model('User', userSchema);