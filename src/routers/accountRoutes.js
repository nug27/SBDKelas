const express = require('express');
const accountController = require('../controller/accountController');

const router = express.Router();

// Route for all accounts
router.get('/', accountController.getAllAccounts);
router.post('/', accountController.createAccount);

// Routes for specific account by ID
router.get('/:id', accountController.getAccountById);
router.put('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

// Get account balance
router.get('/:id/balance', accountController.getAccountBalance);

module.exports = router;