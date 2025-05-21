const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure category names are unique per user and type
categorySchema.index({ user_id: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);