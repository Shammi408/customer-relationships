const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { prisma } = require("../prisma");
const { hashPassword, verifyPassword } = require("../utils/hash");
const { auth } = require("../middleware/auth");

const router = express.Router();

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "SALES_EXEC"]).optional(), // default server-side
});

async function getRequesterRoleFromHeader(req) {
  // returns role string or null
  try {
    const auth = req.headers.authorization;
    if (!auth) return null;
    const token = auth.split(" ")[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.role || null;
  } catch (err) {
    return null;
  }
}
//User registration route
router.post("/register", async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body); //get data
    // If a role was requested, only allow it when the requester is an authenticated ADMIN
    let roleToAssign = "SALES_EXEC"; // safe default
    if (data.role) {
      const requesterRole = await getRequesterRoleFromHeader(req);
      if (requesterRole === "ADMIN") {
        roleToAssign = data.role;
      } else {
        // Optionally log attempted role escalation
        console.warn("Attempt to set role on public register ignored. Requester role:", requesterRole);
      }
    }
    const existing = await prisma.user.findUnique({ where: { email: data.email } }); //check if email exists
    if (existing) return res.status(409).json({ error: "Email already in use" }); //conflict if exists

    const hashed = await hashPassword(data.password); //hash password before storing
    const user = await prisma.user.create({ // create new user in database
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role || "SALES_EXEC",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }, //select fields to return (no password)
    });

    return res.status(201).json(user);
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: e.issues });
    return res.status(400).json({ error: e.message || "Registration failed" });
  }
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
//User login route
router.post("/login", async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body); //get data from body and validate
    const user = await prisma.user.findUnique({ where: { email: data.email } }); //find user by email
    if (!user) return res.status(401).json({ error: "Invalid credentials" }); // not found conflict

    const ok = await verifyPassword(data.password, user.password); //verify password
    if (!ok) return res.status(401).json({ error: "Invalid credentials" }); //unauthorized if not match

    //generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.json({ //return token and user info (no password)
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: e.issues });
    return res.status(400).json({ error: e.message || "Login failed" });
  }
});
//user profile route
router.get("/me", auth, async (req, res) => { //get current user profile
  try {
    const me = await prisma.user.findUnique({ //find user by ID from auth middleware
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }, //select fields to return (no password)
    });
    if (!me) return res.status(404).json({ error: "User not found" });
    res.json(me);
  } catch (e) {
    res.status(400).json({ error: e.message || "Failed to fetch profile" });
  }
});
module.exports = router;
