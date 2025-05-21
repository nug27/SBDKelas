const Category = require('../model/Category');
const Transaction = require('../model/Transaction');
const mongoose = require('mongoose');

// Get all categories for a user
exports.getUserCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user_id: req.params.userId });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new category manually
exports.createCategory = async (req, res) => {
  const category = new Category({
    user_id: req.params.userId,
    name: req.body.name,
    type: req.body.type,
    balance: req.body.balance || 0
  });

  try {
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A category with this name already exists for this user and type' 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.status(200).json(updatedCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A category with this name already exists for this user and type' 
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get category summary with transaction counts and totals
exports.getCategorySummary = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get all categories for this user
    const categories = await Category.find({ user_id: userId });
    
    // Get category summaries with transaction counts
    const summary = await Transaction.aggregate([
      { 
        $match: { 
          id_akun: new mongoose.Types.ObjectId(userId) 
        } 
      },
      {
        $unwind: '$tags'
      },
      {
        $group: {
          _id: {
            category: '$tags',
            type: '$tipe'
          },
          count: { $sum: 1 },
          total: { $sum: '$nominal' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id.category',
          type: '$_id.type',
          count: 1,
          total: 1
        }
      }
    ]);
    
    // Merge with categories collection data
    const result = summary.map(item => {
      const existingCategory = categories.find(
        c => c.name === item.name && c.type === item.type
      );
      
      return {
        ...item,
        _id: existingCategory?._id || null,
        balance: existingCategory?.balance || item.total
      };
    });
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate categories from transaction tags
exports.generateCategoriesFromTags = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.params.userId;
    
    // Get all transactions for this user
    const transactions = await Transaction.find({ id_akun: userId });
    
    // Get existing categories first to avoid unnecessary database queries
    const existingCategories = await Category.find({ user_id: userId });
    
    // Extract unique tags and their types
    const tagData = new Map();
    
    transactions.forEach(transaction => {
      if (!transaction.tags || transaction.tags.length === 0) return;
      
      transaction.tags.forEach(tag => {
        // Skip empty tags
        if (!tag.trim()) return;
        
        const key = `${tag}-${transaction.tipe}`;
        
        if (!tagData.has(key)) {
          tagData.set(key, {
            name: tag,
            type: transaction.tipe,
            balance: 0
          });
        }
        
        const data = tagData.get(key);
        data.balance += transaction.nominal;
      });
    });
    
    // Create categories from tags
    const categories = [];
    const newCategories = [];
    const updatedCategories = [];
    
    for (const categoryData of tagData.values()) {
      // Check if category already exists using the in-memory list
      const existingCategory = existingCategories.find(
        c => c.name === categoryData.name && c.type === categoryData.type
      );
      
      if (existingCategory) {
        // Update existing category
        existingCategory.balance = categoryData.balance;
        await existingCategory.save({ session });
        categories.push(existingCategory);
        updatedCategories.push(existingCategory);
      } else {
        // Create new category
        const newCategory = new Category({
          user_id: userId,
          name: categoryData.name,
          type: categoryData.type,
          balance: categoryData.balance
        });
        
        await newCategory.save({ session });
        categories.push(newCategory);
        newCategories.push(newCategory);
      }
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      message: `Successfully processed categories: ${newCategories.length} created, ${updatedCategories.length} updated`,
      categories
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

// Add this function to get categorized transactions
exports.getCategorizedTransactions = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get transactions with tags for this user
    const transactions = await Transaction.find({ 
      id_akun: userId,
      tags: { $exists: true, $ne: [] } 
    }).sort({ created_at: -1 });
    
    // Get all categories for this user
    const categories = await Category.find({ user_id: userId });
    
    // Map category details to transactions
    const result = transactions.map(tx => {
      const categoryDetails = tx.tags.map(tag => {
        const matchingCategory = categories.find(
          c => c.name === tag && c.type === tx.tipe
        );
        
        return matchingCategory ? {
          name: tag,
          balance: matchingCategory.balance,
          id: matchingCategory._id
        } : {
          name: tag,
          balance: 0,
          id: null
        };
      });
      
      return {
        _id: tx._id,
        deskripsi: tx.deskripsi,
        nominal: tx.nominal,
        tipe: tx.tipe,
        category: tx.category,
        created_at: tx.created_at,
        tags: categoryDetails
      };
    });
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};