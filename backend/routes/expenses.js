const express = require('express');
const { body, query, validationResult } = require('express-validator');
const protect = require('../middleware/auth');
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Group = require('../models/Group');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute splits array from request body based on splitMode.
 * Returns { splits, error }
 */
function computeSplits({ splitMode, splits, amount, paidById, activeMembers, specificMemberIds }) {
  const paidByStr = paidById.toString();

  switch (splitMode) {

    // ── 1. EQUAL: everyone in the group shares equally ──────────────────────
    case 'equal': {
      const perPerson = parseFloat((amount / activeMembers.length).toFixed(2));
      // fix rounding: last person gets remainder
      const total = parseFloat((perPerson * (activeMembers.length - 1)).toFixed(2));
      const lastAmount = parseFloat((amount - total).toFixed(2));

      return {
        splits: activeMembers.map((m, i) => ({
          user: m.user,
          amount: i === activeMembers.length - 1 ? lastAmount : perPerson,
          shares: 1,
          isPaid: m.user.toString() === paidByStr
        }))
      };
    }

    // ── 2. ONLY_ME: payer alone owes the entire amount ──────────────────────
    case 'only_me': {
      return {
        splits: [{
          user: paidById,
          amount,
          shares: 1,
          isPaid: true,
          label: 'Personal expense'
        }]
      };
    }

    // ── 3. SPECIFIC: only listed members split equally ──────────────────────
    case 'specific': {
      if (!specificMemberIds || specificMemberIds.length === 0) {
        return { error: 'specificMemberIds required for specific split.' };
      }
      const ids = specificMemberIds.map(String);
      const selected = activeMembers.filter(m => ids.includes(m.user.toString()));
      if (selected.length === 0) {
        return { error: 'None of the specificMemberIds are active members.' };
      }
      const perPerson = parseFloat((amount / selected.length).toFixed(2));
      const total = parseFloat((perPerson * (selected.length - 1)).toFixed(2));
      const lastAmount = parseFloat((amount - total).toFixed(2));

      return {
        splits: selected.map((m, i) => ({
          user: m.user,
          amount: i === selected.length - 1 ? lastAmount : perPerson,
          shares: 1,
          isPaid: m.user.toString() === paidByStr
        }))
      };
    }

    // ── 4. EXACT: caller specifies ₹ per person ──────────────────────────────
    case 'exact': {
      if (!splits || splits.length === 0) {
        return { error: 'splits array required for exact mode.' };
      }
      const totalExact = splits.reduce((s, sp) => s + Number(sp.amount), 0);
      if (Math.abs(totalExact - amount) > 0.02) {
        return { error: `Exact split amounts (${totalExact}) must equal total (${amount}).` };
      }
      return {
        splits: splits.map(sp => ({
          user: sp.userId,
          amount: Number(sp.amount),
          shares: 1,
          label: sp.label || null,
          isPaid: sp.userId.toString() === paidByStr
        }))
      };
    }

    // ── 5. PERCENTAGE: caller specifies % per person (must total 100) ────────
    case 'percentage': {
      if (!splits || splits.length === 0) {
        return { error: 'splits array required for percentage mode.' };
      }
      const totalPct = splits.reduce((s, sp) => s + Number(sp.amount), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        return { error: `Percentages must total 100. Got ${totalPct}.` };
      }
      const computed = splits.map(sp => ({
        user: sp.userId,
        amount: parseFloat(((Number(sp.amount) / 100) * amount).toFixed(2)),
        shares: 1,
        label: sp.label || null,
        isPaid: sp.userId.toString() === paidByStr
      }));
      // Fix rounding
      const sumComputed = computed.reduce((s, sp) => s + sp.amount, 0);
      const diff = parseFloat((amount - sumComputed).toFixed(2));
      if (diff !== 0) computed[computed.length - 1].amount += diff;

      return { splits: computed };
    }

    // ── 6. WEIGHTED: share units per person ──────────────────────────────────
    //    e.g. Alice=2, Bob=1, Carol=1 → Alice pays 50%, others 25% each
    //    Perfect for: "Bob covered Dave who left early → Bob gets 2 shares"
    case 'weighted': {
      if (!splits || splits.length === 0) {
        return { error: 'splits array required for weighted mode.' };
      }
      const totalShares = splits.reduce((s, sp) => s + Number(sp.shares || 1), 0);
      if (totalShares <= 0) {
        return { error: 'Total shares must be greater than 0.' };
      }
      const computed = splits.map(sp => {
        const shareCount = Number(sp.shares || 1);
        return {
          user: sp.userId,
          amount: parseFloat(((shareCount / totalShares) * amount).toFixed(2)),
          shares: shareCount,
          label: sp.label || null,
          isPaid: sp.userId.toString() === paidByStr
        };
      });
      // Fix rounding
      const sumComputed = computed.reduce((s, sp) => s + sp.amount, 0);
      const diff = parseFloat((amount - sumComputed).toFixed(2));
      if (diff !== 0) computed[computed.length - 1].amount += diff;

      return { splits: computed };
    }

    default:
      return { error: `Unknown splitMode: ${splitMode}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/expenses — Add an expense
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, [
  body('groupId').notEmpty().withMessage('groupId is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
  body('splitMode').optional().isIn(['equal', 'only_me', 'specific', 'exact', 'percentage', 'weighted']),
  body('category').optional().isIn([
    'food', 'transport', 'accommodation', 'entertainment',
    'shopping', 'utilities', 'medical', 'fuel',
    'groceries', 'subscriptions', 'other'
  ]),
  body('tags').optional().isArray(),
  body('note').optional().isString().isLength({ max: 500 }),
  body('receiptUrl').optional().isURL(),
  body('splits').optional().isArray(),
  body('specificMemberIds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      groupId, description, amount, splitMode = 'equal',
      splits, specificMemberIds, category = 'other',
      tags, note, receiptUrl, paidBy, date
    } = req.body;

    // ── Validate group & membership ────────────────────────────────
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(req.user.userId)) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }

    // ── Validate paidBy ────────────────────────────────────────────
    const paidById = paidBy || req.user.userId;
    if (!group.isMember(paidById)) {
      return res.status(400).json({ message: 'paidBy user is not an active member.' });
    }

    const activeMembers = group.members.filter(m => m.status === 'accepted');

    // ── Compute splits ─────────────────────────────────────────────
    const { splits: computedSplits, error } = computeSplits({
      splitMode,
      splits,
      amount: Number(amount),
      paidById,
      activeMembers,
      specificMemberIds
    });

    if (error) return res.status(400).json({ message: error });

    // ── Validate split user IDs are group members (for manual modes) ──
    if (['exact', 'percentage', 'weighted'].includes(splitMode)) {
      const memberIds = activeMembers.map(m => m.user.toString());
      const invalid = computedSplits.find(s => !memberIds.includes(s.user.toString()));
      if (invalid) {
        return res.status(400).json({
          message: `User ${invalid.user} in splits is not an active group member.`
        });
      }
    }

    // ── Create expense ─────────────────────────────────────────────
    const expense = await Expense.create({
      group: groupId,
      description,
      amount: Number(amount),
      currency: group.currency,
      paidBy: paidById,
      splitMode,
      splits: computedSplits,
      category,
      tags: tags || [],
      note: note || null,
      receiptUrl: receiptUrl || null,
      date: date ? new Date(date) : new Date(),
      createdBy: req.user.userId
    });

    await expense.populate('paidBy', 'name email');
    await expense.populate('splits.user', 'name email');
    await expense.populate('createdBy', 'name');

    // ── Budget alert check (non-blocking) ─────────────────────────
    let budgetAlert = null;
    if (group.budget && group.budget.totalLimit) {
      try {
        budgetAlert = await checkBudgetAlert(group, groupId);
      } catch (_) { /* non-critical */ }
    }

    res.status(201).json({
      expense,
      ...(budgetAlert && { budgetAlert })
    });

  } catch (err) {
    console.error('Add expense error:', err);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID format.' });
    res.status(500).json({ message: 'Server error adding expense.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses — Filtered expense list
//
// Query params:
//   groupId       — filter by group (required unless view=personal)
//   view          — 'group' | 'all_groups' | 'personal' | 'paid_by_me' | 'i_owe'
//   category      — filter by category
//   splitMode     — filter by split mode
//   paidBy        — filter by who paid (userId)
//   startDate     — ISO date string
//   endDate       — ISO date string
//   minAmount     — number
//   maxAmount     — number
//   tags          — comma-separated tags e.g. "beach,food"
//   isSettled     — true | false
//   search        — text search on description
//   sortBy        — 'date' | 'amount' | 'category' (default: date)
//   sortOrder     — 'asc' | 'desc' (default: desc)
//   page          — pagination page (default: 1)
//   limit         — results per page (default: 20, max: 100)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['date', 'amount', 'category', 'description']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('view').optional().isIn(['group', 'all_groups', 'personal', 'paid_by_me', 'i_owe'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      groupId,
      view = 'group',
      category,
      splitMode,
      paidBy,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      tags,
      isSettled,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user.userId;
    const filter = {};

    // ── View logic ─────────────────────────────────────────────────
    if (view === 'all_groups') {
      // All expenses across all groups the user is an accepted member of
      const myGroups = await Group.find({
        members: { $elemMatch: { user: userId, status: 'accepted' } }
      }).select('_id');
      filter.group = { $in: myGroups.map(g => g._id) };

    } else if (view === 'personal') {
      // Expenses where I am in the splits (I owe something)
      filter['splits.user'] = userId;
      if (groupId) filter.group = groupId;

    } else if (view === 'paid_by_me') {
      // Expenses I paid for
      filter.paidBy = userId;
      if (groupId) filter.group = groupId;

    } else if (view === 'i_owe') {
      // Expenses where I have an unpaid split
      filter['splits'] = { $elemMatch: { user: userId, isPaid: false } };
      if (groupId) filter.group = groupId;

    } else {
      // Default: group view — groupId is required
      if (!groupId || groupId === 'undefined' || groupId === 'null') {
        return res.status(400).json({ message: 'groupId required for group view.' });
      }
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID format.' });
      }
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found.' });
      if (!group.isMember(userId)) return res.status(403).json({ message: 'Access denied.' });
      filter.group = groupId;
    }

    // ── Optional filters ───────────────────────────────────────────
    if (category) filter.category = category;
    if (splitMode) filter.splitMode = splitMode;
    if (paidBy) filter.paidBy = paidBy;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase());
      filter.tags = { $in: tagList };
    }

    if (isSettled !== undefined) {
      filter.isSettled = isSettled === 'true';
    }

    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    // ── Sort ───────────────────────────────────────────────────────
    const sortField = { date: 'date', amount: 'amount', category: 'category', description: 'description' }[sortBy] || 'date';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    // ── Pagination ─────────────────────────────────────────────────
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    // ── Execute ────────────────────────────────────────────────────
    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email')
        .populate('createdBy', 'name')
        .populate('group', 'name currency')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(filter)
    ]);

    // ── Summary stats ──────────────────────────────────────────────
    const summary = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' },
          countByCategory: { $push: '$category' }
        }
      }
    ]);

    res.json({
      expenses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      },
      summary: summary[0] ? {
        totalAmount: parseFloat((summary[0].totalAmount || 0).toFixed(2)),
        avgAmount: parseFloat((summary[0].avgAmount || 0).toFixed(2)),
        maxAmount: summary[0].maxAmount || 0,
        minAmount: summary[0].minAmount || 0
      } : { totalAmount: 0, avgAmount: 0, maxAmount: 0, minAmount: 0 }
    });

  } catch (err) {
    console.error('Get expenses error:', err);
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error fetching expenses.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/balances/summary — Who owes whom (optimised)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/balances/summary', protect, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId || groupId === 'undefined' || groupId === 'null') {
      return res.status(400).json({ message: 'Valid groupId required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid groupId format.' });
    }

    const group = await Group.findById(groupId)
      .populate('members.user', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    console.log('req.user:', req.user);
    console.log('group members:', group.members.map(m => ({ id: (m.user._id || m.user).toString(), status: m.status })));
    
    const isMember = group.members.some(
      m => (m.user._id || m.user).toString() === req.user._id.toString() && m.status === 'accepted'
    );
    if (!isMember) return res.status(403).json({ message: 'Access denied.' });

    const expenses = await Expense.find({ group: groupId, isSettled: false })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email');

    // Build net balance map
    const net = {};
    const memberMap = {};
    group.members.filter(m => m.status === 'accepted').forEach(m => {
      net[m.user._id.toString()] = 0;
      memberMap[m.user._id.toString()] = m.user;
    });

    expenses.forEach(expense => {
      const payerId = expense.paidBy._id.toString();
      expense.splits.forEach(split => {
        if (split.isPaid) return;
        const splitUserId = split.user._id.toString();
        if (splitUserId === payerId) return;
        net[payerId] = (net[payerId] || 0) + split.amount;
        net[splitUserId] = (net[splitUserId] || 0) - split.amount;
      });
    });

    // Per-member balance array
    const balances = Object.entries(net).map(([id, balance]) => ({
      user: memberMap[id],
      balance: parseFloat(balance.toFixed(2)),
      status: balance > 0.01 ? 'owed' : balance < -0.01 ? 'owes' : 'settled'
    }));

    // Simplified settlements (minimise transactions)
    const settlements = minimiseTransactions(net, memberMap);

    res.json({ balances, settlements, currency: group.currency });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/stats/breakdown — Category + time breakdown
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats/breakdown', protect, async (req, res) => {
  try {
    const { groupId, startDate, endDate, view = 'category' } = req.query;
    // Extra guard for valid Object ID
    if (!groupId || groupId === 'undefined' || groupId === 'null') {
      return res.status(400).json({ message: 'groupId required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID format.' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(req.user.userId)) return res.status(403).json({ message: 'Access denied.' });

    const match = { group: group._id, isSettled: false };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    let pipeline;
    if (view === 'category') {
      pipeline = [
        { $match: match },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        },
        { $sort: { total: -1 } }
      ];
    } else if (view === 'monthly') {
      pipeline = [
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ];
    } else if (view === 'member') {
      pipeline = [
        { $match: match },
        {
          $group: {
            _id: '$paidBy',
            totalPaid: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { 'user.password': 0 } },
        { $sort: { totalPaid: -1 } }
      ];
    } else {
      return res.status(400).json({ message: 'view must be category | monthly | member' });
    }

    const results = await Expense.aggregate(pipeline);
    const totals = await Expense.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.json({
      groupId,
      currency: group.currency,
      view,
      total: totals[0] ? parseFloat(totals[0].total.toFixed(2)) : 0,
      count: totals[0] ? totals[0].count : 0,
      breakdown: results
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error.' });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// GET /api/expenses/:id — Single expense
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('createdBy', 'name')
      .populate('lastEditedBy', 'name');

    if (!expense) return res.status(404).json({ message: 'Expense not found.' });

    const group = await Group.findById(expense.group);
    if (!group || !group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(expense);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/expenses/:id — Edit an expense
// Only the creator or group admin can edit.
// Splits are fully recomputed from the new inputs.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', protect, [
  body('description').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ gt: 0 }),
  body('splitMode').optional().isIn(['equal', 'only_me', 'specific', 'exact', 'percentage', 'weighted']),
  body('category').optional().isIn([
    'food', 'transport', 'accommodation', 'entertainment',
    'shopping', 'utilities', 'medical', 'fuel',
    'groceries', 'subscriptions', 'other'
  ]),
  body('note').optional().isString().isLength({ max: 500 }),
  body('receiptUrl').optional().isURL(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user.userId.toString();
    const isAdmin = group.isAdmin(req.user.userId);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only the creator or an admin can edit this expense.' });
    }

    // If any split-affecting field changed, recompute
    const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : expense.amount;
    const newSplitMode = req.body.splitMode || expense.splitMode;
    const paidById = req.body.paidBy || expense.paidBy;
    const activeMembers = group.members.filter(m => m.status === 'accepted');

    if (req.body.amount || req.body.splitMode || req.body.splits || req.body.specificMemberIds || req.body.paidBy) {
      const { splits: newSplits, error } = computeSplits({
        splitMode: newSplitMode,
        splits: req.body.splits,
        amount: newAmount,
        paidById,
        activeMembers,
        specificMemberIds: req.body.specificMemberIds
      });
      if (error) return res.status(400).json({ message: error });
      expense.splits = newSplits;
    }

    // Apply scalar updates
    if (req.body.description !== undefined) expense.description = req.body.description;
    if (req.body.amount !== undefined) expense.amount = newAmount;
    if (req.body.splitMode !== undefined) expense.splitMode = newSplitMode;
    if (req.body.category !== undefined) expense.category = req.body.category;
    if (req.body.note !== undefined) expense.note = req.body.note;
    if (req.body.receiptUrl !== undefined) expense.receiptUrl = req.body.receiptUrl;
    if (req.body.tags !== undefined) expense.tags = req.body.tags;
    if (req.body.date !== undefined) expense.date = new Date(req.body.date);
    if (req.body.paidBy !== undefined) expense.paidBy = req.body.paidBy;

    expense.lastEditedBy = req.user._id;
    expense.lastEditedAt = new Date();

    await expense.save();
    await expense.populate('paidBy', 'name email');
    await expense.populate('splits.user', 'name email');

    res.json({ message: 'Expense updated.', expense });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error updating expense.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/expenses/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user.userId.toString();
    const isAdmin = group.isAdmin(req.user.userId);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only the creator or an admin can delete this expense.' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/expenses/:id/settle-split — Mark YOUR split as paid
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/settle-split', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });

    const split = expense.splits.find(
      s => s.user.toString() === req.user.userId.toString()
    );
    if (!split) {
      return res.status(404).json({ message: "You don't have a split in this expense." });
    }
    if (split.isPaid) {
      return res.status(400).json({ message: 'Your split is already marked as paid.' });
    }

    split.isPaid = true;
    split.paidAt = new Date();

    // If ALL splits are paid, mark entire expense as settled
    const allPaid = expense.splits.every(s => s.isPaid);
    if (allPaid) expense.isSettled = true;

    await expense.save();
    res.json({
      message: 'Your split marked as paid.',
      fullySettled: allPaid
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: 'Server error.' });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Minimise number of settlement transactions
// Classic greedy algorithm — works perfectly for ≤20 people
// ─────────────────────────────────────────────────────────────────────────────
function minimiseTransactions(net, memberMap) {
  const creditors = []; // people owed money
  const debtors = [];   // people who owe money

  Object.entries(net).forEach(([id, bal]) => {
    const amount = parseFloat(bal.toFixed(2));
    if (amount > 0.01) creditors.push({ id, amount });
    else if (amount < -0.01) debtors.push({ id, amount: Math.abs(amount) });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const settlement = parseFloat(Math.min(credit.amount, debt.amount).toFixed(2));

    transactions.push({
      from: memberMap[debt.id],
      to: memberMap[credit.id],
      amount: settlement
    });

    credit.amount = parseFloat((credit.amount - settlement).toFixed(2));
    debt.amount = parseFloat((debt.amount - settlement).toFixed(2));

    if (credit.amount <= 0.01) i++;
    if (debt.amount <= 0.01) j++;
  }

  return transactions;
}

/**
 * Check if group is near/over budget and return an alert object if so.
 */
async function checkBudgetAlert(group, groupId) {
  if (!group.budget || !group.budget.totalLimit) return null;

  const budgetMatch = { group: group._id, isSettled: false };

  // Period-based date filter
  if (group.budget.period === 'monthly') {
    const now = new Date();
    budgetMatch.date = {
      $gte: new Date(now.getFullYear(), now.getMonth(), 1),
      $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    };
  } else if (group.budget.period === 'weekly') {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    budgetMatch.date = { $gte: weekStart };
  } else if (group.budget.startDate) {
    budgetMatch.date = { $gte: group.budget.startDate };
    if (group.budget.endDate) budgetMatch.date.$lte = group.budget.endDate;
  }

  const result = await Expense.aggregate([
    { $match: budgetMatch },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  const spent = result[0] ? result[0].total : 0;
  const limit = group.budget.totalLimit;
  const pct = parseFloat(((spent / limit) * 100).toFixed(1));
  const threshold = group.budget.alertThreshold || 80;

  if (pct >= 100) {
    return { type: 'over_budget', spent, limit, pct, message: `⚠️ Over budget! Spent ₹${spent} of ₹${limit} budget.` };
  }
  if (pct >= threshold) {
    return { type: 'near_budget', spent, limit, pct, message: `📊 ${pct}% of budget used (₹${spent} of ₹${limit}).` };
  }
  return null;
}

module.exports = router;
