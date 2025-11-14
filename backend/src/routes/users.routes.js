const express = require("express");
const { prisma } = require("../prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// GET /api/users?role=SALES_EXEC (Admin/Manager only)
router.get("/", auth, requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const role = req.query.role; 
  const where = role ? { role } : {};
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

// GET /api/leads/:id (with owner + activities)
router.get("/:id", auth, async (req, res) => {
  const id = req.params.id;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true } },
      activities: { orderBy: { createdAt: "desc" } }
    },
  });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  res.json(lead);
});

module.exports = router;
