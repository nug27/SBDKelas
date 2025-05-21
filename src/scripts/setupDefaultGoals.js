require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Account = require('../model/Account');
const Goal = require('../model/Goal');

/**
 * @fileoverview Default Goals Setup Script
 * 
 * This script creates default financial goals for existing accounts
 * that don't have any goals yet. It sets up an emergency fund goal
 * for each user based on their current balance.
 */

async function setupDefaultGoals() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGOTOKEN, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Get all accounts
    const accounts = await Account.find();
    console.log(`Found ${accounts.length} accounts`);
    
    let created = 0;
    let skipped = 0;
    
    // Process each account
    for (const account of accounts) {
      // Check if the account already has any goals
      const existingGoals = await Goal.countDocuments({ user_id: account._id });
      
      if (existingGoals === 0) {
        // Create an emergency fund goal based on account balance
        // Target is either 6 months of estimated expenses (3x balance) or minimum 10,000,000
        const suggestedTarget = Math.max(account.balance * 3, 10000000);
        
        const goal = new Goal({
          user_id: account._id,
          title: 'Dana Darurat',
          description: 'Dana darurat untuk kebutuhan mendesak, disarankan sebesar 6x pengeluaran bulanan',
          target_amount: suggestedTarget,
          saved_amount: 0
        });
        
        await goal.save();
        created++;
        console.log(`Created emergency fund goal for ${account.username}`);
      } else {
        skipped++;
        console.log(`Skipped ${account.username} - already has goals`);
      }
    }
    
    console.log(`Setup complete: ${created} goals created, ${skipped} accounts skipped`);
  } catch (error) {
    console.error('Error setting up default goals:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

setupDefaultGoals();