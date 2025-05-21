const express = require('express');
const goalController = require('../controller/goalController');

/**
 * @fileoverview Goal Routes
 * 
 * This file defines the API endpoints for financial goals management.
 * All routes are prefixed with '/api/goals' in the main application.
 */

const router = express.Router();

/**
 * User-specific goal routes
 * Base: /api/goals/user/:userId
 */
// Get all goals for a specific user
router.get('/user/:userId', goalController.getUserGoals);

// Create a new goal for a user
router.post('/user/:userId', goalController.createGoal);

// Get goals summary for a user
router.get('/user/:userId/summary', goalController.getGoalsSummary);

/**
 * Individual goal routes
 * Base: /api/goals/:id
 */
// Get a specific goal by ID
router.get('/:id', goalController.getGoalById);

// Update an existing goal
router.put('/:id', goalController.updateGoal);

// Delete a goal
router.delete('/:id', goalController.deleteGoal);

/**
 * Goal fund management routes
 * Base: /api/goals/:id/allocate|withdraw
 */
// Add funds to a goal
router.post('/:id/allocate', goalController.allocateFunds);

// Withdraw funds from a goal
router.post('/:id/withdraw', goalController.withdrawFunds);

module.exports = router;