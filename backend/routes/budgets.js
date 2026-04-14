const express = require('express');
const { body, validationResult } = require('express-validator');
const protect = require('../middleware/auth');
const Group = require('../models/Group');
const Expense = require('../models/Expense');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/budget — Set or update group budget
// Only admin can set a budget.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:groupId/budget', protect, [
  body('totalLimit').optional().isFloat({ gt: 0 }).withMessage('totalLimit must be a positive number'),
  body('period').optional().isIn(['trip', 'monthly', 'weekly']),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('alertThreshold').optional().isInt({ min: 1, max: 100 }),
  body('categoryBudgets').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can set a budget.' });
    }

    const { totalLimit, period, startDate, endDate, alertThreshold, categoryBudgets } = req.body;

    // Validate endDate > startDate
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'endDate must be after startDate.' });
    }

    // Build budget object — keep existing values if not provided
    const budget = group.budget || {};

    if (totalLimit !== undefined) budget.totalLimit = totalLimit;
    if (period !== undefined) budget.period = period;
    if (startDate !== undefined) budget.startDate = new Date(startDate);
    if (endDate !== undefined) budget.endDate = new Date(endDate);
    if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;
    if (categoryBudgets !== undefined) {
      // Validate category names
      const validCategories = [
        'food', 'transport', 'accommodation', 'entertainment',
        'shopping', 'utilities', 'medical', 'fuel',
        'groceries', 'subscriptions', 'other'
      ];
      const invalid = categoryBudgets.find(cb => !validCategories.includes(cb.category));
      if (invalid) {
        return res.status(400).json({ message: `Invalid category: "${invalid.category}"` });
      }
      budget.categoryBudgets = categoryBudgets;
    }

    group.budget = budget;
    await group.save();

    res.json({ message: 'Budget saved.', budget: group.budget });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid group ID.' });
    res.status(500).json({ message: 'Server error saving budget.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:groupId/budget — Remove budget from group
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:groupId/budget', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can remove a budget.' });
    }

    group.budget = null;
    await group.save();
    res.json({ message: 'Budget removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/groups/:groupId/budget/progress — Budget progress report
//
// Returns:
//   - Total spent vs budget limit
//   - % used
//   - Per-category spend vs category budget
//   - Remaining budget
//   - Projected overspend based on daily average (for trip/monthly)
//   - Alert if near threshold
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:groupId/budget/progress', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!group.budget || !group.budget.totalLimit) {
      return res.status(404).json({ message: 'No budget set for this group.' });
    }

    const budget = group.budget;

    // ── Build date filter matching budget period ────────────────────
    const dateFilter = {};
    if (budget.period === 'monthly') {
      const now = new Date();
      dateFilter.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.$lt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (budget.period === 'weekly') {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      dateFilter.$gte = weekStart;
    } else if (budget.startDate) {
      dateFilter.$gte = budget.startDate;
      if (budget.endDate) dateFilter.$lte = budget.endDate;
    }

    const expenseMatch = {
      group: group._id,
      isSettled: false,
      ...(Object.keys(dateFilter).length && { date: dateFilter })
    };

    // ── Total spent ────────────────────────────────────────────────
    const [totalResult, categoryResult] = await Promise.all([
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ])
    ]);

    const totalSpent = totalResult[0] ? parseFloat(totalResult[0].total.toFixed(2)) : 0;
    const expenseCount = totalResult[0] ? totalResult[0].count : 0;
    const limit = budget.totalLimit;
    const remaining = parseFloat((limit - totalSpent).toFixed(2));
    const pct = parseFloat(((totalSpent / limit) * 100).toFixed(1));

    // ── Per-category budget vs spend ───────────────────────────────
    const categoryProgress = categoryResult.map(cat => {
      const catBudget = budget.categoryBudgets?.find(cb => cb.category === cat._id);
      const catLimit = catBudget ? catBudget.limit : null;
      const catPct = catLimit ? parseFloat(((cat.total / catLimit) * 100).toFixed(1)) : null;
      return {
        category: cat._id,
        spent: parseFloat(cat.total.toFixed(2)),
        count: cat.count,
        limit: catLimit,
        remaining: catLimit ? parseFloat((catLimit - cat.total).toFixed(2)) : null,
        pct: catPct,
        status: catLimit
          ? (catPct >= 100 ? 'over' : catPct >= (budget.alertThreshold || 80) ? 'warning' : 'ok')
          : 'no_limit'
      };
    });

    // ── Daily rate / projection ────────────────────────────────────
    let projection = null;
    if (budget.startDate) {
      const start = new Date(budget.startDate);
      const now = new Date();
      const daysElapsed = Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
      const dailyRate = parseFloat((totalSpent / daysElapsed).toFixed(2));

      if (budget.endDate) {
        const totalDays = Math.ceil((new Date(budget.endDate) - start) / (1000 * 60 * 60 * 24));
        const projectedTotal = parseFloat((dailyRate * totalDays).toFixed(2));
        const projectedOverrun = parseFloat((projectedTotal - limit).toFixed(2));

        projection = {
          dailyRate,
          daysElapsed,
          totalDays,
          projectedTotal,
          projectedOverrun,
          onTrack: projectedTotal <= limit
        };
      }
    }

    // ── Alert level ────────────────────────────────────────────────
    let alertLevel = 'ok';
    if (pct >= 100) alertLevel = 'over_budget';
    else if (pct >= (budget.alertThreshold || 80)) alertLevel = 'warning';

    res.json({
      groupId: group._id,
      groupName: group.name,
      currency: group.currency,
      budget: {
        limit,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        alertThreshold: budget.alertThreshold
      },
      progress: {
        totalSpent,
        remaining,
        pct,
        expenseCount,
        alertLevel,
        message:
          alertLevel === 'over_budget'
            ? `⚠️ Over budget by ${group.currency} ${Math.abs(remaining)}`
            : alertLevel === 'warning'
            ? `⚡ ${pct}% of budget used — ${group.currency} ${remaining} remaining`
            : `✅ On track — ${group.currency} ${remaining} remaining`
      },
      categoryProgress,
      projection
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid group ID.' });
    res.status(500).json({ message: 'Server error getting budget progress.' });
  }
});

module.exports = router;
