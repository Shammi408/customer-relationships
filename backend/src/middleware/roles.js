const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(403).json({ error: "Forbidden" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
};

module.exports = { requireRole };
