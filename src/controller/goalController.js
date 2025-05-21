const Goal = require('../model/Goal');
const Account = require('../model/Account');
const Transaction = require('../model/Transaction');
const mongoose = require('mongoose');

/**
 * @fileoverview Goal Controller
 * 
 * This controller handles all operations related to financial goals including CRUD
 * operations, fund allocation, and goal-related analytics.
 */

/**
 * Get all goals for a specific user
 * 
 * @route GET /api/goals/user/:userId
 * @param {string} req.params.userId - The ID of the user
 * @returns {Array} Array of goal objects
 */
exports.getUserGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user_id: req.params.userId });
    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get a specific goal by ID
 * 
 * @route GET /api/goals/:id
 * @param {string} req.params.id - The ID of the goal
 * @returns {Object} Goal object
 */
exports.getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    res.status(200).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new financial goal
 * 
 * @route POST /api/goals/user/:userId
 * @param {string} req.params.userId - The ID of the user
 * @param {Object} req.body - Goal details
 * @param {string} req.body.title - Goal title
 * @param {number} req.body.target_amount - Target amount to save
 * @param {string} [req.body.description] - Optional goal description
 * @param {Date} [req.body.target_date] - Optional target date
 * @param {number} [req.body.saved_amount] - Optional initial saved amount
 * @returns {Object} Newly created goal
 */
exports.createGoal = async (req, res) => {
  try {
    // Validate that the user exists
    const account = await Account.findById(req.params.userId);
    if (!account) {
      return res.status(404).json({ message: 'User account not found' });
    }
    
    // Create a new goal
    const goal = new Goal({
      user_id: req.params.userId,
      title: req.body.title,
      description: req.body.description || '',
      target_amount: req.body.target_amount,
      saved_amount: req.body.saved_amount || 0,
      target_date: req.body.target_date
    });
    
    const newGoal = await goal.save();
    res.status(201).json(newGoal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Update a financial goal
 * 
 * @route PUT /api/goals/:id
 * @param {string} req.params.id - The ID of the goal to update
 * @param {Object} req.body - Updated goal properties
 * @returns {Object} Updated goal object
 */
exports.updateGoal = async (req, res) => {
  try {
    const updatedGoal = await Goal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    res.status(200).json(updatedGoal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Delete a financial goal
 * 
 * @route DELETE /api/goals/:id
 * @param {string} req.params.id - The ID of the goal to delete
 * @returns {Object} Success message
 */
exports.deleteGoal = async (req, res) => {
  try {
    const deletedGoal = await Goal.findByIdAndDelete(req.params.id);
    
    if (!deletedGoal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    res.status(200).json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add funds to a goal's saved amount
 * 
 * @route POST /api/goals/:id/allocate
 * @param {string} req.params.id - The ID of the goal
 * @param {Object} req.body - Allocation details
 * @param {number} req.body.amount - Amount to add to the saved_amount
 * @param {string} [req.body.note] - Optional note about the allocation
 * @param {boolean} [req.body.create_transaction=false] - Whether to create a transaction record
 * @returns {Object} Updated goal object
 */
exports.allocateFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get the goal
    const goal = await Goal.findById(req.params.id).session(session);
    if (!goal) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    const amount = Number(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid allocation amount' });
    }
    
    // Update the goal's saved amount
    goal.saved_amount += amount;
    await goal.save({ session });
    
    // Create a transaction record if requested
    if (req.body.create_transaction) {
      const transaction = new Transaction({
        id_akun: goal.user_id,
        tipe: 'expense', // It's an expense from main balance to goal
        deskripsi: `Goal allocation: ${goal.title}` + (req.body.note ? ` - ${req.body.note}` : ''),
        nominal: amount,
        category: 'savings',
        tags: ['goal', 'savings', goal.title.toLowerCase().replace(/\s+/g, '-')],
        created_at: new Date()
      });
      
      await transaction.save({ session });
      
      // Update account balance
      const account = await Account.findById(goal.user_id).session(session);
      if (account) {
        account.balance -= amount;
        await Account.findByIdAndUpdate(
          goal.user_id, 
          { balance: account.balance },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Return the updated goal
    const updatedGoal = await Goal.findById(req.params.id);
    res.status(200).json(updatedGoal);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

/**
 * Remove funds from a goal's saved amount
 * 
 * @route POST /api/goals/:id/withdraw
 * @param {string} req.params.id - The ID of the goal
 * @param {Object} req.body - Withdrawal details
 * @param {number} req.body.amount - Amount to withdraw from the saved_amount
 * @param {string} [req.body.note] - Optional note about the withdrawal
 * @param {boolean} [req.body.create_transaction=false] - Whether to create a transaction record
 * @returns {Object} Updated goal object
 */
exports.withdrawFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get the goal
    const goal = await Goal.findById(req.params.id).session(session);
    if (!goal) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    const amount = Number(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }
    
    if (amount > goal.saved_amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Withdrawal amount exceeds saved amount',
        available: goal.saved_amount
      });
    }
    
    // Update the goal's saved amount
    goal.saved_amount -= amount;
    await goal.save({ session });
    
    // Create a transaction record if requested
    if (req.body.create_transaction) {
      const transaction = new Transaction({
        id_akun: goal.user_id,
        tipe: 'income', // It's income to main balance from goal
        deskripsi: `Goal withdrawal: ${goal.title}` + (req.body.note ? ` - ${req.body.note}` : ''),
        nominal: amount,
        category: 'savings',
        tags: ['goal', 'withdrawal', goal.title.toLowerCase().replace(/\s+/g, '-')],
        created_at: new Date()
      });
      
      await transaction.save({ session });
      
      // Update account balance
      const account = await Account.findById(goal.user_id).session(session);
      if (account) {
        account.balance += amount;
        await Account.findByIdAndUpdate(
          goal.user_id, 
          { balance: account.balance },
          { session }
        );
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    // Return the updated goal
    const updatedGoal = await Goal.findById(req.params.id);
    res.status(200).json(updatedGoal);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

/**
 * Get a summary of all user goals with progress analytics
 * 
 * @route GET /api/goals/user/:userId/summary
 * @param {string} req.params.userId - The ID of the user
 * @returns {Object} Goals summary information
 */
exports.getGoalsSummary = async (req, res) => {
  try {
    const goals = await Goal.find({ user_id: req.params.userId });
    
    // Calculate summary data
    const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
    const totalSavedAmount = goals.reduce((sum, goal) => sum + goal.saved_amount, 0);
    
    const completedGoals = goals.filter(goal => goal.status === 'completed');
    const activeGoals = goals.filter(goal => goal.status === 'active');
    const pausedGoals = goals.filter(goal => goal.status === 'paused');
    
    // Format goal data with additional details
    const goalsWithDetails = goals.map(goal => {
      const remainingAmount = goal.target_amount - goal.saved_amount;
      const progressPercentage = goal.target_amount > 0 
        ? Math.min((goal.saved_amount / goal.target_amount) * 100, 100) 
        : 0;
      
      return {
        _id: goal._id,
        title: goal.title,
        target_amount: goal.target_amount,
        saved_amount: goal.saved_amount,
        remaining_amount: remainingAmount,
        progress: Math.round(progressPercentage),
        status: goal.status,
        target_date: goal.target_date
      };
    });
    
    const summary = {
      total_goals: goals.length,
      completed_goals: completedGoals.length,
      active_goals: activeGoals.length,
      paused_goals: pausedGoals.length,
      total_target_amount: totalTargetAmount,
      total_saved_amount: totalSavedAmount,
      total_progress: totalTargetAmount > 0 
        ? Math.round((totalSavedAmount / totalTargetAmount) * 100)
        : 0,
      goals: goalsWithDetails
    };
    
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};