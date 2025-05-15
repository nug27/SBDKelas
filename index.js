require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const transactionRoutes = require('./src/routers/transactionRoutes');
const accountRoutes = require('./src/routers/accountRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB with better error handling
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

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Financial Tracker API is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});