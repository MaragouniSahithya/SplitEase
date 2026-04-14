const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const protect = require('../middleware/auth');
const simplifyDebts = require('../utils/debtSimplifier');

const router = express.Router();

// All group routes are protected
router.use(protect);

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/groups — Create a group
// ──────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description, currency, memberEmails } = req.body;

    if (!name) return res.status(400).json({ message: 'Group name is required.' });

    // Find existing users by email to auto-invite
    const invitedUsers = memberEmails
      ? await User.find({ email: { $in: memberEmails.map(e => e.toLowerCase()) } })
      : [];

    const members = [
      { user: req.user.userId, role: 'admin', status: 'accepted', joinedAt: new Date() },
      ...invitedUsers.map(u => ({
        user: u._id,
        role: 'member',
        status: 'pending'
      }))
    ];

    const group = await Group.create({
      name,
      description: description || '',
      currency: currency || 'INR',
      createdBy: req.user.userId,
      members
    });

    await group.populate('members.user', 'name email');
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/groups — Get all groups the user is an accepted member of
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({
      members: { $elemMatch: { user: req.user.userId, status: 'accepted' } }
    })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');

    // Attach total expenses per group and calculate myBalance
    const result = await Promise.all(groups.map(async g => {
      const allExpenses = await Expense.find({ group: g._id });
      
      let total = 0;
      let myBalance = 0;
      
      allExpenses.forEach(exp => {
        total += exp.amount;
        if (!exp.isSettled) {
          if (exp.paidBy.toString() === req.user.userId) {
            myBalance += exp.amount;
          }
          exp.splits.forEach(s => {
            if (s.user.toString() === req.user.userId && !s.isPaid) {
              myBalance -= s.amount;
            }
          });
        }
      });

      const obj = g.toObject();
      obj.totalExpenses = parseFloat(total.toFixed(2));
      obj.myBalance = parseFloat(myBalance.toFixed(2));
      return obj;
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/groups/:id — Get single group detail
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(
      m => m.user._id.toString() === req.user.userId && m.status === 'accepted'
    );
    if (!isMember) return res.status(403).json({ message: 'Not a member' });

    const expenses = await Expense.find({ group: req.params.id })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ date: -1 });

    const rawTransactions = [];
    expenses.forEach(expense => {
      expense.splits.forEach(split => {
        if (split.user._id.toString() !== expense.paidBy._id.toString() && !split.isPaid) {
          rawTransactions.push({
            from: split.user._id.toString(),
            to: expense.paidBy._id.toString(),
            amount: split.amount
          });
        }
      });
    });

    const simplifiedDebts = simplifyDebts(rawTransactions);

    // Re-map IDs → populated user objects
    const allMembers = {};
    group.members.forEach(m => {
      if (m.user?._id) allMembers[m.user._id.toString()] = m.user;
    });

    const populatedDebts = simplifiedDebts.map(d => ({
      from: allMembers[d.from] || { _id: d.from, name: 'Unknown' },
      to:   allMembers[d.to]   || { _id: d.to,   name: 'Unknown' },
      amount: d.amount
    }));

    res.json({ group, expenses, simplifiedDebts: populatedDebts });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid group ID.' });
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/groups/:id — Update group (admin only)
// ──────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isAdmin(req.user.userId)) return res.status(403).json({ message: 'Only admins can update the group.' });

    const { name, description, currency } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (currency) group.currency = currency;
    await group.save();

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:id/leave — Leave a group
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id/leave', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    const memberIdx = group.members.findIndex(
      m => m.user.toString() === req.user.userId && m.status === 'accepted'
    );
    if (memberIdx === -1) return res.status(400).json({ message: 'You are not an active member.' });

    group.members[memberIdx].status = 'left';
    await group.save();
    res.json({ message: 'You have left the group.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:id — Admin only, deletes group and all its expenses
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isAdmin(req.user.userId)) {
      return res.status(403).json({ message: 'Only admins can delete a group.' });
    }
    await Expense.deleteMany({ group: group._id });
    await group.deleteOne();
    res.json({ message: 'Group deleted.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid group ID.' });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;