const express = require('express');
const transactionController = require('../controller/TransactionController');

const router = express.Router();

// Route for all transactions
router.get('/', transactionController.getAllTransactions);
router.post('/', transactionController.createTransaction);

// Route for getting transactions by account ID - MOVED BEFORE :id route
router.get('/account/:accountId', transactionController.getTransactionsByAccount);

// Routes for specific transaction by ID
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;