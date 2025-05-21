const mongoose = require('mongoose');

/**
 * @fileoverview Goal Model Schema
 * 
 * This schema defines the structure for financial goals, allowing users to track savings 
 * toward specific targets such as emergency funds, vacation funds, or major purchases.
 */

/**
 * Goal Schema
 * @typedef {Object} Goal
 * @property {ObjectId} user_id - Reference to the account that owns this goal
 * @property {String} title - Name of the financial goal
 * @property {String} description - Optional description of the goal
 * @property {Number} target_amount - Total amount needed to complete the goal
 * @property {Number} saved_amount - Current amount saved toward the goal
 * @property {Date} target_date - Optional target date for goal completion
 * @property {String} status - Current status of the goal: 'active', 'completed', 'paused'
 * @property {Date} created_at - When the goal was created
 * @property {Date} updated_at - When the goal was last updated
 */
const goalSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  target_amount: {
    type: Number,
    required: true,
    min: 0
  },
  saved_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  target_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the updated_at field before saving
goalSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  // Auto-update status to 'completed' if saved amount >= target amount
  if (this.saved_amount >= this.target_amount) {
    this.status = 'completed';
  }
  
  next();
});

// Virtual property to calculate percentage completion
goalSchema.virtual('progress').get(function() {
  if (this.target_amount === 0) return 0;
  return Math.min(Math.round((this.saved_amount / this.target_amount) * 100), 100);
});

// Virtual property to calculate remaining amount
goalSchema.virtual('remaining_amount').get(function() {
  return Math.max(this.target_amount - this.saved_amount, 0);
});

// Include virtuals when converting to JSON
goalSchema.set('toJSON', { virtuals: true });
goalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);