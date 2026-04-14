const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  status: { type: String, enum: ['pending', 'accepted', 'left'], default: 'accepted' },
  joinedAt: { type: Date, default: Date.now }
});

/**
 * Budget sub-document.
 * A group can set an overall budget and/or per-category budgets.
 * 
 * period: 'trip' = one-time total, 'monthly' = resets each month
 * 
 * categoryBudgets: optional per-category limits
 *   e.g. { food: 3000, transport: 1500 }
 */
const categoryBudgetSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'food', 'transport', 'accommodation', 'entertainment',
      'shopping', 'utilities', 'medical', 'fuel',
      'groceries', 'subscriptions', 'other'
    ],
    required: true
  },
  limit: { type: Number, required: true, min: 1 }
}, { _id: false });

const budgetSchema = new mongoose.Schema({
  totalLimit: { type: Number, min: 1, default: null },
  period: {
    type: String,
    enum: ['trip', 'monthly', 'weekly'],
    default: 'trip'
  },
  startDate: { type: Date, default: Date.now },
  // for 'trip' period, optional end date
  endDate: { type: Date, default: null },
  categoryBudgets: [categoryBudgetSchema],
  alertThreshold: {
    type: Number,
    min: 1,
    max: 100,
    default: 80   // send alert when 80% of budget is used
  }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [memberSchema],
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD']
  },
  isArchived: { type: Boolean, default: false },

  // Optional budget for this group
  budget: { type: budgetSchema, default: null }

}, { timestamps: true });

// ── Methods ────────────────────────────────────────────────────────

groupSchema.methods.isMember = function (userId) {
  return this.members.some(
    m => m.user.toString() === userId.toString() && m.status === 'accepted'
  );
};

groupSchema.methods.isAdmin = function (userId) {
  return this.members.some(
    m => m.user.toString() === userId.toString()
      && m.role === 'admin'
      && m.status === 'accepted'
  );
};

module.exports = mongoose.model('Group', groupSchema);
