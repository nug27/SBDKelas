require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const transactionRoutes = require('./src/routers/transactionRoutes');
const accountRoutes = require('./src/routers/accountRoutes');
const categoryRoutes = require('./src/routers/categoryRoutes');
const goalRoutes = require('./src/routers/goalRoutes'); // Add this line

/**
 * @fileoverview Main Application Entry Point
 * 
 * This file initializes the Express server, connects to MongoDB,
 * and configures all API routes for the financial tracker application.
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Connect to MongoDB with error handling
mongoose.connect(process.env.MONGOTOKEN, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB');
    console.log(`Database name: ${mongoose.connection.db.databaseName}`);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
    console.error('Error details:', err);
    
    if (err.message.includes('bad auth')) {
      console.error('Authentication failed. Please check your username and password.');
    }
  });

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/goals', goalRoutes); // Register goal routes

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Financial Tracker API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});