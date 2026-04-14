const express = require('express');
const jwt = require('jsonwebtoken');
const protect = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/invitations — List pending invitations for the logged-in user
// ──────────────────────────────────────────────────────────────────────────────
router.get('/invitations', protect, async (req, res) => {
  try {
    const userId = req.user.userId;

    const groups = await Group.find({
      members: { $elemMatch: { user: userId, status: 'pending' } }
    }).populate('createdBy', 'name email');

    const invitations = groups.map(group => ({
      _id: group._id,
      group: { _id: group._id, name: group.name, currency: group.currency },
      inviter: group.createdBy,
      status: 'pending'
    }));

    res.json({ invitations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/invitations/:id/respond — Accept or decline a group invitation
// Body: { action: 'accept' | 'decline' }
// ──────────────────────────────────────────────────────────────────────────────
router.post('/invitations/:id/respond', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { action } = req.body;
    const groupId = req.params.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be "accept" or "decline".' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    const memberIdx = group.members.findIndex(
      m => m.user.toString() === userId.toString() && m.status === 'pending'
    );

    if (memberIdx === -1) {
      return res.status(404).json({ message: 'No pending invitation found for this group.' });
    }

    if (action === 'accept') {
      group.members[memberIdx].status = 'accepted';
      group.members[memberIdx].joinedAt = new Date();
      await group.save();
      res.json({ message: 'Invitation accepted.', group: { _id: group._id, name: group.name } });
    } else {
      group.members.splice(memberIdx, 1);
      await group.save();
      res.json({ message: 'Invitation declined.' });
    }
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid group ID.' });
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/invitations/:id — Cancel/dismiss an invitation
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/invitations/:id', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    const memberIdx = group.members.findIndex(
      m => m.user.toString() === userId.toString() && m.status === 'pending'
    );
    if (memberIdx === -1) return res.status(404).json({ message: 'Invitation not found.' });

    group.members.splice(memberIdx, 1);
    await group.save();
    res.json({ message: 'Invitation cancelled.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/invitations/:id/resend — Resend an invitation (no-op stub for API compatibility)
// ──────────────────────────────────────────────────────────────────────────────
router.post('/invitations/:id/resend', protect, async (req, res) => {
  try {
    res.json({ message: 'Invitation resent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/invite — Send an invitation to a user by email
// ──────────────────────────────────────────────────────────────────────────────
router.post('/groups/:groupId/invite', protect, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.userId;

    if (!email) return res.status(400).json({ message: 'email is required.' });

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(userId)) return res.status(403).json({ message: 'Access denied.' });

    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) {
      // User not registered — generate a magic-link token
      const token = jwt.sign(
        { groupId: group._id, email: email.toLowerCase(), invitedBy: userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        message: `No account found for ${email}. Share this invite link:`,
        inviteToken: token,
        inviteLink: `${process.env.FRONTEND_URL || '${process.env.CLIENT_URL}'}/register?invite=${token}`
      });
    }

    // User is registered — add as pending member if not already
    const alreadyIn = group.members.some(m => m.user.toString() === invitee._id.toString());
    if (alreadyIn) return res.status(400).json({ message: 'User is already a member or has a pending invite.' });

    group.members.push({ user: invitee._id, role: 'member', status: 'pending' });
    await group.save();

    res.json({ message: `Invitation sent to ${email}.` });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid group ID.' });
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/groups/:groupId/invitations — List pending invitations for a group
// ──────────────────────────────────────────────────────────────────────────────
router.get('/groups/:groupId/invitations', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const group = await Group.findById(req.params.groupId).populate('members.user', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(userId)) return res.status(403).json({ message: 'Access denied.' });

    const pending = group.members.filter(m => m.status === 'pending').map(m => ({
      _id: m._id,
      user: m.user,
      status: m.status
    }));

    res.json({ invitations: pending });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/invite/verify/:token — Verify a magic-link invite token
// ──────────────────────────────────────────────────────────────────────────────
router.get('/invite/verify/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const group = await Group.findById(decoded.groupId).select('name');
    const inviter = await User.findById(decoded.invitedBy).select('name email');
    if (!group) return res.status(404).json({ message: 'Group not found.' });

    res.json({
      email: decoded.email,
      groupName: group.name,
      inviterName: inviter?.name || 'Someone',
      groupId: decoded.groupId
    });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired invite token.' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/groups/:groupId/invitations/:memberId — Admin cancels a specific pending invite
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/groups/:groupId/invitations/:memberId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found.' });
    if (!group.isMember(req.user.userId)) return res.status(403).json({ message: 'Access denied.' });

    const memberIdx = group.members.findIndex(
      m => m.user.toString() === req.params.memberId && m.status === 'pending'
    );
    if (memberIdx === -1) return res.status(404).json({ message: 'Pending invitation not found.' });

    group.members.splice(memberIdx, 1);
    await group.save();
    res.json({ message: 'Invitation cancelled.' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID.' });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
