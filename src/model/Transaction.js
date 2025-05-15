const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  id_akun: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  tipe: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  deskripsi: {
    type: String,
    required: true
  },
  nominal: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    default: 'lainnya'
  },
  tags: {
    type: [String],
    default: []
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);