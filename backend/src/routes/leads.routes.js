const express = require("express");
const { z } = require("zod");
const { prisma } = require("../prisma");
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { requireOwnerOrManager } = require("../middleware/owner");
const { logAudit } = require("../utils/audit");

module.exports = function (io) {
  const router = express.Router();

  const LeadCreateSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.enum(["NEW","CONTACTED","QUALIFIED","WON","LOST"]).optional(),
    ownerId: z.string().optional(),
  });

  // CREATE lead
  router.post("/", auth, requireRole("ADMIN", "MANAGER", "SALES_EXEC"), async (req, res) => {
    try {
      const data = LeadCreateSchema.parse(req.body);

      const lead = await prisma.lead.create({
        data: {
          name: data.name,
          email: data.email ?? null,
          phone: data.phone ?? null,
          status: data.status ?? "NEW",
          owner: data.ownerId
            ? { connect: { id: data.ownerId } }
            : { connect: { id: req.user.id } }, // fallback to creator
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
          },
        },
      });

      io.emit("lead:created", lead); // 🔊 Global event — everyone sees new leads
      // 🎯 Private notification only for the owner
      if (lead.ownerId) {
        io.to(`user:${lead.ownerId}`).emit("notification:leadAssigned", {
          leadId: lead.id,
          ownerId: lead.ownerId,
          leadName: lead.name,
        });
      }
      await logAudit({
        userId: req.user?.id ?? null,
        action: "LEAD_CREATE",
        resource: "lead",
        resourceId: lead.id,
        meta: { name: lead.name, ownerId: lead.ownerId || null }
      });
      res.status(201).json(lead);
    } catch (e) {
      if (e?.issues) return res.status(400).json({ error: e.issues });
      res.status(400).json({ error: e.message || "Failed to create lead" });
    }
  });

  // LIST (with pagination/search code )
  router.get("/", auth, async (req, res) => {
    const {
      page = "1", limit = "10", q, status, sort = "createdAt", order = "desc", mine
    } = req.query;

    const take = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where = {
      ...(status ? { status } : {}),
      ...(mine === "true" ? { ownerId: req.user.id } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true } },
          activities: true
        },
        orderBy: { [sort]: order === "asc" ? "asc" : "desc" },
        skip,
        take,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ page: Number(page), limit: take, total, pages: Math.ceil(total / take), items });
  });

  // GET /api/leads/:id  →  fetch full lead details (with owner + activities)
  router.get("/:id", auth, async (req, res) => {
    try {
      const id = req.params.id;
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          activities: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message || "Failed to fetch lead" });
    }
  });

  const LeadUpdateSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.enum(["NEW","CONTACTED","QUALIFIED","WON","LOST"]).optional(),
    ownerId: z.string().nullable().optional(),
  });

  // UPDATE (owner or manager/admin)
 router.put("/:id", auth, requireOwnerOrManager, async (req, res) => {
  try {
    const id = req.params.id;
    const data = LeadUpdateSchema.parse(req.body);

    const prev = await prisma.lead.findUnique({ where: { id } });
    if (!prev) return res.status(404).json({ error: "Lead not found" });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        owner:
          data.ownerId === null
            ? { disconnect: true }
            : data.ownerId
            ? { connect: { id: data.ownerId } }
            : undefined,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
        },
      },
    });

    io.emit("lead:updated", lead); //  Global lead updated
    //  Status change tracking
    if (data.status && data.status !== prev.status) {
      await prisma.activity.create({
        data: {
          leadId: id,
          type: "STATUS_CHANGE",
          note: `Status ${prev.status} → ${data.status}`,
          userId: req.user?.id ?? null,
        },
      });

      io.emit("lead:statusChanged", {
        leadId: id,
        from: prev.status,
        to: data.status,
      });
    }

    //  Owner change notifications (private)
    if (data.ownerId && data.ownerId !== prev.ownerId) {
      
      io.to(`user:${data.ownerId}`).emit("notification:leadAssigned", { // New owner gets an assignment
        leadId: id,
        ownerId: data.ownerId,
        leadName: lead.name,
      });
      
      if (prev.ownerId) { // Old owner gets unassigned message
        io.to(`user:${prev.ownerId}`).emit("notification:leadUnassigned", {
          leadId: id,
          prevOwnerId: prev.ownerId,
          leadName: lead.name,
        });
      }
    } else if (data.ownerId === null && prev.ownerId) {
      // Just unassigned (no new owner)
      io.to(`user:${prev.ownerId}`).emit("notification:leadUnassigned", {
        leadId: id,
        prevOwnerId: prev.ownerId,
        leadName: lead.name,
      });
    }

    // Build a small diff of changed fields
    const changed = {};
    ["name", "email", "phone", "status", "ownerId"].forEach((k) => {
        // prev may be null/undefined keys; use loose equality
      if ((prev[k] ?? null) !== (lead[k] ?? null)) {
        changed[k] = { before: prev[k] ?? null, after: lead[k] ?? null };
      }
    });

    // Only log update if something actually changed (safety)
    if (Object.keys(changed).length > 0) {
      logAudit({
        userId: req.user?.id ?? null,
        action: "LEAD_UPDATE",
        resource: "lead",
        resourceId: id,
        meta: { changed }
      });
    }
    // Specific logs for owner assignment/unassignment
    if (data.ownerId && data.ownerId !== prev.ownerId) {
      logAudit({
        userId: req.user?.id ?? null,
        action: "LEAD_ASSIGN",
        resource: "lead",
        resourceId: id,
        meta: { from: prev.ownerId ?? null, to: data.ownerId }
      });
    } else if (data.ownerId === null && prev.ownerId) {
      logAudit({
        userId: req.user?.id ?? null,
        action: "LEAD_UNASSIGN",
        resource: "lead",
        resourceId: id,
        meta: { from: prev.ownerId }
      });
    }

    res.json(lead);
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: e.issues });
    res.status(400).json({ error: e.message || "Failed to update lead" });
  }
  });

  // DELETE (owner or manager/admin) — with transaction OR rely on cascade you added
  router.delete("/:id", auth, requireOwnerOrManager, async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await prisma.lead.delete({ where: { id } });

      // 🔊 Global delete event
      io.emit("lead:deleted", { id: deleted.id, name: deleted.name });

      // Notify old owner privately (if any)
      if (deleted.ownerId) {
        io.to(`user:${deleted.ownerId}`).emit("notification:leadUnassigned", {
          leadId: deleted.id,
          prevOwnerId: deleted.ownerId,
          leadName: deleted.name,
        });
      }
      await logAudit({
        userId: req.user?.id ?? null,
        action: "LEAD_DELETE",
        resource: "lead",
        resourceId: deleted.id,
        meta: { name: deleted.name }
      });

      res.json({ ok: true });
    } catch (e) {
      if (e.code === "P2025") return res.status(404).json({ error: "Lead not found" });
      res.status(400).json({ error: e.message || "Failed to delete lead" });
    }
  });

  return router;
};
