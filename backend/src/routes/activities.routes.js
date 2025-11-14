const express = require("express");
const { z } = require("zod");
const { prisma } = require("../prisma");
const { auth } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");

module.exports = function (io) {
  const router = express.Router();

  const ActivityCreateSchema = z.object({
    leadId: z.string(),
    type: z.enum(["NOTE","CALL","MEETING","STATUS_CHANGE"]),
    note: z.string().optional(),
  });
  //Creating new activity
  router.post("/", auth, async (req, res) => {
    try {
      const data = ActivityCreateSchema.parse(req.body); //get data from body and validate
      const activity = await prisma.activity.create({ //make new activity in database
        data: {
          leadId: data.leadId,
          type: data.type,
          note: data.note ?? null,
          userId: req.user?.id ?? null,
        },
        include: { lead: true },
      });
      io.emit("activity:created", activity); //emit socket event to all connected clients
      await logAudit({ //log audit trail for activity creation
        userId: req.user?.id ?? null,
        action: "ACTIVITY_CREATE",
        resource: "activity",
        resourceId: activity.id,
        meta: { type: activity.type, leadId: activity.leadId }
      });

      res.status(201).json(activity); //send created activity as response
    } catch (e) {
      if (e?.issues) return res.status(400).json({ error: e.issues });
      res.status(400).json({ error: e.message || "Failed to create activity" });
    }
  });

  router.get("/by-lead/:leadId", auth, async (req, res) => { //get activities by lead ID
    const items = await prisma.activity.findMany({ //find activities in database
      where: { leadId: req.params.leadId },
      orderBy: { createdAt: "desc" },
    });
    res.json(items); //send found activities as response
  });

  return router;
};
