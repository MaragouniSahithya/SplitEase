const express = require('express');
const { body, validationResult } = require('express-validator');
const protect = require('../middleware/auth');
const Expense = require('../models/Expense');
const Group = require('../models/Group');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/settle — Record a settlement payment
//
// "I paid Bob ₹350 to clear my debt"
// This marks all or part of an unpaid split as settled.
//
// Body:
//   payeeId  — the person being paid (creditor)
//   amount   — how much is being settled
//   note     — optional note e.g. "GPay transfer"
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:groupId/settle', protect, [
  body('payeeId').notEmpty().withMessage('payeeId (who you paid) is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0'),
  body('note').optional().isString().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { payeeId, amount, note } = req.body;
    const payerId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(payerId)) return res.status(403).json({ message: 'Access denied.' });
    if (!group.isMember(payeeId)) {
      return res.status(400).json({ message: 'payeeId is not an active group member.' });
    }
    if (payerId.toString() === payeeId.toString()) {
      return res.status(400).json({ message: "You can't settle with yourself." });
    }

    // ── Create a settlement expense (amount = 0 impact, just records transfer) ─
    // We model this as a special expense so it appears in the timeline
    const settlement = await Expense.create({
      group: groupId,
      description: note ? `Settlement: ${note}` : 'Settlement payment',
      amount: Number(amount),
      currency: group.currency,
      paidBy: payerId,
      splitMode: 'exact',
      splits: [{
        user: payerId,
        amount: Number(amount),
        shares: 1,
        label: `Paid to settle debt with payee`,
        isPaid: true,
        paidAt: new Date()
      }],
      category: 'other',
      tags: ['settlement'],
      note: note || null,
      date: new Date(),
      createdBy: payerId,
      isSettled: true   // settlement expenses don't contribute to balance
    });

    // ── Now mark unpaid splits in real expenses ───────────────────
    // Find all expenses where payer owes payee money
    const unpaidExpenses = await Expense.find({
      group: groupId,
      paidBy: payeeId,
      isSettled: false,
      splits: { $elemMatch: { user: payerId, isPaid: false } }
    }).sort('date');

    let remaining = Number(amount);
    const settledExpenseIds = [];

    for (const expense of unpaidExpenses) {
      if (remaining <= 0) break;
      const split = expense.splits.find(s => s.user.toString() === payerId.toString());
      if (!split || split.isPaid) continue;

      if (remaining >= split.amount - 0.01) {
        split.isPaid = true;
        split.paidAt = new Date();
        remaining = parseFloat((remaining - split.amount).toFixed(2));
        settledExpenseIds.push(expense._id);

        // Check if whole expense is now settled
        if (expense.splits.every(s => s.isPaid)) {
          expense.isSettled = true;
        }
      }
      // Partial settlement: leave split unpaid but reduce (advanced)
      // For simplicity, we only mark splits fully paid when amount covers them

      await expense.save();
    }

    res.status(201).json({
      message: `Settlement of ${group.currency} ${amount} recorded.`,
      settlement: { _id: settlement._id, amount, date: settlement.date },
      settledExpenses: settledExpenseIds.length,
      remainingUnaccounted: parseFloat(Math.max(remaining, 0).toFixed(2))
    });

  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error recording settlement.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/settle-all — Settle ALL debts in the group
// Admin-only. Marks everything as settled (used when group trip ends).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:groupId/settle-all', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can settle all expenses.' });
    }

    const result = await Expense.updateMany(
      { group: req.params.groupId, isSettled: false },
      {
        $set: {
          isSettled: true,
          'splits.$[elem].isPaid': true,
          'splits.$[elem].paidAt': new Date()
        }
      },
      { arrayFilters: [{ 'elem.isPaid': false }] }
    );

    res.json({
      message: 'All expenses settled.',
      settledCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
