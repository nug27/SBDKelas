const express = require('express');
const categoryController = require('../controller/categoryController');

const router = express.Router();

// Routes for user categories
router.get('/user/:userId', categoryController.getUserCategories);
router.get('/user/:userId/summary', categoryController.getCategorySummary);
router.post('/user/:userId', categoryController.createCategory);
router.post('/user/:userId/generate', categoryController.generateCategoriesFromTags);
router.get('/user/:userId/transactions', categoryController.getCategorizedTransactions);

// Routes for specific categories by ID
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;