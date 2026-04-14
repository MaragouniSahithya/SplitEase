const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const protect = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    // If an invite token is present, look up the group and auto-accept membership
    let joinedGroup = null;
    if (inviteToken) {
      try {
        const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
        const group = await Group.findById(decoded.groupId);
        if (group) {
          // Check if user already has a pending slot (invited by email)
          const memberSlot = group.members.find(m => {
            // Some flows pre-add pending member by userId placeholder; skip if not found
            return false;
          });
          // Add user as accepted member if not already there
          const alreadyMember = group.members.some(m => m.user.toString() === user._id.toString());
          if (!alreadyMember) {
            group.members.push({ user: user._id, role: 'member', status: 'accepted', joinedAt: new Date() });
            await group.save();
          }
          joinedGroup = { id: group._id, name: group.name };
        }
      } catch (e) {
        // Invalid invite token — not fatal, just skip
        console.warn('Invalid inviteToken during register:', e.message);
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
      joinedGroup
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Count pending group invitations
    const pendingGroups = await Group.countDocuments({
      members: { $elemMatch: { user: user._id, status: 'pending' } }
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
      pendingInvites: pendingGroups
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me — return current user from token
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Count pending invitations
    const pendingInvites = await Group.countDocuments({
      members: { $elemMatch: { user: user._id, status: 'pending' } }
    });

    res.json({ user: { _id: user._id, name: user.name, email: user.email }, pendingInvites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/profile — Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { ...(name && { name }) },
      { new: true }
    ).select('-passwordHash');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;