const express = require("express");
const { prisma } = require("../prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// Admin/Manager: list logs with filters
router.get("/", auth, requireRole("ADMIN","MANAGER"), async (req, res) => {
  try {
    const { page = 1, limit = 20, q, userId, action, resource, since } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (q) {
      // basic text search on meta (Postgres JSONB -> text cast) — fallback to no-op if not supported
      const search = q.toLowerCase();
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { resource: { contains: search, mode: "insensitive" } },
      ];
    }
    if (since) {
      const d = new Date(since);
      if (!isNaN(d)) where.createdAt = { gte: d };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * lim,
        take: lim,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ page: pageNum, limit: lim, total, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// User: view their own logs
router.get("/mine", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * lim,
        take: lim,
      }),
      prisma.auditLog.count({ where: { userId: req.user.id } }),
    ]);

    res.json({ page: pageNum, limit: lim, total, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch your logs" });
  }
});

module.exports = router;
