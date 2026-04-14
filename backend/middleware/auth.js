const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'No token, access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize: expose both req.user.userId and req.user._id for compatibility
    req.user = {
      ...decoded,
      _id: decoded.userId,   // expenses.js, budgets.js, settlements.js use req.user._id
      userId: decoded.userId // invitations.js uses req.user.userId
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};