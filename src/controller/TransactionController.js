const mongoose = require('mongoose');
const Transaction = require('../model/Transaction');
const Account = require('../model/Account');
const Category = require('../model/Category'); // Add this import

// Update the updateCategoryBalances function
async function updateCategoryBalances(transaction, session, reverseAmount = false) {
  if (!transaction.tags || transaction.tags.length === 0) return;
  
  const multiplier = reverseAmount ? -1 : 1;
  const amount = transaction.nominal * multiplier;
  
  // Update each category associated with the tags
  for (const tagName of transaction.tags) {
    if (!tagName.trim()) continue;
    
    // Find or create the category
    let category = await Category.findOne({
      user_id: transaction.id_akun,
      name: tagName,
      type: transaction.tipe
    }).session(session);
    
    if (category) {
      // Update existing category
      category.balance += amount;
      await category.save({ session });
    } else {
      // Create new category
      category = new Category({
        user_id: transaction.id_akun,
        name: tagName,
        type: transaction.tipe,
        balance: amount
      });
      await category.save({ session });
    }
  }
}

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single transaction
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new transaction
exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = new Transaction({
      id_akun: req.body.id_akun,
      tipe: req.body.tipe,
      deskripsi: req.body.deskripsi,
      nominal: req.body.nominal,
      category: req.body.category || 'lainnya',
      tags: req.body.tags || [],
      created_at: req.body.created_at || new Date()
    });

    // Save the transaction
    const newTransaction = await transaction.save({ session });

    // Update account balance
    const account = await Account.findById(req.body.id_akun);
    if (!account) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Account not found' });
    }

    // Update balance based on transaction type
    if (req.body.tipe === 'income') {
      account.balance += req.body.nominal;
    } else if (req.body.tipe === 'expense') {
      account.balance -= req.body.nominal;
    }

    await Account.findByIdAndUpdate(
      req.body.id_akun,
      { balance: account.balance },
      { session }
    );

    // Update category balances
    await updateCategoryBalances(newTransaction, session);

    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json(newTransaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// Update a transaction
exports.updateTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the original transaction
    const originalTransaction = await Transaction.findById(req.params.id);
    if (!originalTransaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Get the account
    const account = await Account.findById(originalTransaction.id_akun);
    if (!account) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Account not found' });
    }

    // Revert the effect of the original transaction
    if (originalTransaction.tipe === 'income') {
      account.balance -= originalTransaction.nominal;
    } else if (originalTransaction.tipe === 'expense') {
      account.balance += originalTransaction.nominal;
    }

    // Revert category balances for the original transaction
    await updateCategoryBalances(originalTransaction, session, true);

    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, session }
    );

    // Apply the effect of the updated transaction
    const newTipe = req.body.tipe || originalTransaction.tipe;
    const newNominal = req.body.nominal || originalTransaction.nominal;

    if (newTipe === 'income') {
      account.balance += newNominal;
    } else if (newTipe === 'expense') {
      account.balance -= newNominal;
    }

    // Save the updated account balance
    await Account.findByIdAndUpdate(
      account._id,
      { balance: account.balance },
      { session }
    );

    // Update category balances for the new transaction data
    await updateCategoryBalances(updatedTransaction, session);

    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json(updatedTransaction);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Get the account
    const account = await Account.findById(transaction.id_akun);
    if (!account) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Account not found' });
    }

    // Update balance based on transaction type
    if (transaction.tipe === 'income') {
      account.balance -= transaction.nominal;
    } else if (transaction.tipe === 'expense') {
      account.balance += transaction.nominal;
    }

    // Update category balances (reverse the effect)
    await updateCategoryBalances(transaction, session, true);

    // Delete the transaction
    await Transaction.findByIdAndDelete(req.params.id, { session });

    // Save the updated account balance
    await Account.findByIdAndUpdate(
      account._id,
      { balance: account.balance },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Get transactions by account
exports.getTransactionsByAccount = async (req, res) => {
  try {
    const transactions = await Transaction.find({ id_akun: req.params.accountId });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};