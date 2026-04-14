const mongoose = require('mongoose');

/**
 * Split entry — one per person who owes a share of this expense.
 *
 * shares: used for weighted splits.
 *   e.g. if Alice gets 2 shares and Bob gets 1, Alice pays 2/3, Bob pays 1/3.
 *   This directly solves "someone covered an absent person's share"
 *   — just give that person shares: 2.
 *
 * label: optional note on why someone has a different share.
 *   e.g. "covering Raj who left early"
 */
const splitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  shares: { type: Number, default: 1, min: 0.1 }, // used for weighted mode
  label: { type: String, trim: true, default: null }, // e.g. "covering Raj"
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date, default: null }
}, { _id: true });

const expenseSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'INR', uppercase: true },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /**
   * splitMode — how the expense is divided:
   *
   *  equal       — split evenly among ALL active group members
   *  only_me     — only the payer owes it (personal expense tracked in group)
   *  specific    — only selected members split it equally
   *  exact       — specify exact ₹ per person
   *  percentage  — specify % per person (must total 100)
   *  weighted    — specify share units per person (e.g. 2:1:1)
   *               "someone covered an absent person's share" = shares: 2 for that person
   */
  splitMode: {
    type: String,
    enum: ['equal', 'only_me', 'specific', 'exact', 'percentage', 'weighted'],
    default: 'equal'
  },

  splits: [splitSchema],

  category: {
    type: String,
    enum: [
      'food', 'transport', 'accommodation', 'entertainment',
      'shopping', 'utilities', 'medical', 'fuel',
      'groceries', 'subscriptions', 'other'
    ],
    default: 'other',
    index: true
  },

  // Custom tags e.g. ["beach", "night-out"]
  tags: [{ type: String, trim: true, lowercase: true }],

  // Optional memo
  note: { type: String, trim: true, maxlength: 500, default: null },

  // Receipt image URL (upload handled by frontend/cloud storage)
  receiptUrl: { type: String, default: null },

  date: { type: Date, default: Date.now, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isSettled: { type: Boolean, default: false, index: true },

  // Audit trail
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastEditedAt: { type: Date, default: null }
}, { timestamps: true });

// Compound indexes for common queries
expenseSchema.index({ group: 1, date: -1 });
expenseSchema.index({ group: 1, category: 1 });
expenseSchema.index({ 'splits.user': 1, isSettled: 1 });
expenseSchema.index({ paidBy: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
