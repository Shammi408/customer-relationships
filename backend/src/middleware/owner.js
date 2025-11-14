const { prisma } = require("../prisma");

const requireOwnerOrManager = async (req, res, next) => {
  const { id } = req.params; // lead id
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Admin/Manager can proceed
  if (user.role === "ADMIN" || user.role === "MANAGER") return next();

  // Sales exec must own the lead
  const lead = await prisma.lead.findUnique({ where: { id }, select: { ownerId: true } });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.ownerId !== user.id) return res.status(403).json({ error: "Not your lead" });

  next();
};

module.exports = { requireOwnerOrManager };
