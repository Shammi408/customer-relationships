const { prisma } = require("../prisma");

async function logAudit({ userId = null, action, resource = null, resourceId = null, meta = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        meta,
      },
    });
  } catch (err) {
    // don't crash the request if logging fails; just console.log for dev
    console.error("Failed to write audit log:", err);
  }
}

module.exports = { logAudit };
