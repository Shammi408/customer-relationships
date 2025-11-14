const express = require("express");
const { prisma } = require("../prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

router.get("/leads-by-status", auth, requireRole("ADMIN", "MANAGER"), async (_req, res) => {
  const statuses = ["NEW","CONTACTED","QUALIFIED","WON","LOST"];
  const counts = await Promise.all(
    statuses.map(async (s) => ({ status: s, count: await prisma.lead.count({ where: { status: s } }) }))
  );
  res.json(counts);
});

router.get("/activities-7d", auth, requireRole("ADMIN", "MANAGER"), async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 6);

  const items = await prisma.activity.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const bucket = {};
  for (const a of items) {
    const d = a.createdAt.toISOString().slice(0,10);
    bucket[d] = (bucket[d] || 0) + 1;
  }

  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since); d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0,10);
    out.push({ date: key, count: bucket[key] || 0 });
  }

  res.json(out);
});

/**
 * Role-aware overview:
 * - SALES_EXEC: only their leads (ownerId = me)
 * - ADMIN/MANAGER: all leads unless ?mine=true is provided
 * Returns:
 *  - countsByStatus: [{status,count}]
 *  - totals: { total, won, lost, contacted, qualified, new }
 *  - winRate: number (0..1)
 *  - activities7d: [{date,count}]
 *  - leads30d: [{date,count}] (lead creations per day)
 */
// Role-aware overview route shows everything or scoped to user
router.get("/overview", auth, async (req, res) => {
  try {
    const isSales = req.user.role === "SALES_EXEC";
    const mine = req.query.mine === "true";

    // Build base filter for leads (owner scoping)
    const whereLeads = {};
    if (isSales) {
      whereLeads.ownerId = req.user.id;
    } else if (mine) {
      whereLeads.ownerId = req.user.id;
    }

    // counts by status (safe: uses lead.count scoped by whereLeads)
    const statuses = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];
    const countsByStatus = await Promise.all(
      statuses.map(async (s) => ({
        status: s,
        count: await prisma.lead.count({ where: { ...whereLeads, status: s } }),
      }))
    );

    // totals + winRate
    const total = await prisma.lead.count({ where: whereLeads });
    const getCount = (s) => countsByStatus.find(x => x.status === s)?.count || 0;
    const totals = {
      total,
      new: getCount("NEW"),
      contacted: getCount("CONTACTED"),
      qualified: getCount("QUALIFIED"),
      won: getCount("WON"),
      lost: getCount("LOST"),
    };
    const winRate = total ? totals.won / total : 0;

    //  get lead IDs in scope (if scope limits exist)
    let leadIdsInScope = null;
    if (whereLeads.ownerId) {
      const leadRows = await prisma.lead.findMany({
        where: whereLeads,
        select: { id: true },
      });
      leadIdsInScope = leadRows.map(r => r.id);
    }

    //  activities in last 7 days
    const since7 = new Date();
    since7.setDate(since7.getDate() - 6);

    // If scoped by owner, filter by leadId IN (ids), otherwise normal filter
    const activitiesWhere = leadIdsInScope
      ? { createdAt: { gte: since7 }, leadId: { in: leadIdsInScope } }
      : { createdAt: { gte: since7 } };

    const acts = await prisma.activity.findMany({
      where: activitiesWhere,
      select: { createdAt: true },
    });

    const b7 = {};
    for (const a of acts) {
      const k = a.createdAt.toISOString().slice(0,10);
      b7[k] = (b7[k] || 0) + 1;
    }
    const activities7d = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since7);
      d.setDate(since7.getDate() + i);
      const k = d.toISOString().slice(0,10);
      activities7d.push({ date: k, count: b7[k] || 0 });
    }

    //  leads created last 30 days (scoped with leadIdsInScope or whereLeads)
    const since30 = new Date();
    since30.setDate(since30.getDate() - 29);

    // If we already have leadIdsInScope it's simplest to filter by id IN and createdAt
    const createdWhere = leadIdsInScope
      ? { id: { in: leadIdsInScope }, createdAt: { gte: since30 } }
      : { ...whereLeads, createdAt: { gte: since30 } };

    const created = await prisma.lead.findMany({
      where: createdWhere,
      select: { createdAt: true },
    });
    const b30 = {};
    for (const l of created) {
      const k = l.createdAt.toISOString().slice(0,10);
      b30[k] = (b30[k] || 0) + 1;
    }
    const leads30d = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(since30);
      d.setDate(since30.getDate() + i);
      const k = d.toISOString().slice(0,10);
      leads30d.push({ date: k, count: b30[k] || 0 });
    }

    const payload = {
      scope: isSales ? "mine" : (mine ? "mine" : "all"),
      countsByStatus,
      totals,
      winRate,
      activities7d,
      leads30d,
    };

    return res.json(payload);
  } catch (err) {
    console.error("Overview error:", err);
    return res.status(500).json({ error: "Failed to compute overview" });
  }
});

//  Per–sales-exec breakdown (Admin/Manager) ---
router.get("/by-owner", auth, requireRole("ADMIN","MANAGER"), async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
  const execs = await prisma.user.findMany({
    where: { role: "SALES_EXEC" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const statuses = ["NEW","CONTACTED","QUALIFIED","WON","LOST"];
  const rows = [];
  for (const u of execs) {
    const where = { ownerId: u.id };
    const total = await prisma.lead.count({ where });
    const counts = {};
    for (const s of statuses) counts[s] = await prisma.lead.count({ where: { ...where, status: s } });
    const won = counts.WON || 0;
    rows.push({
      ownerId: u.id,
      ownerName: u.name,
      ownerEmail: u.email,
      total,
      winRate: total ? won / total : 0,
      ...counts,
    });
  }

  rows.sort((a,b) => b.total - a.total);
  res.json(rows.slice(0, limit));
});

module.exports = router;
