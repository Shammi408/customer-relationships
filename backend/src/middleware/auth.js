const jwt = require("jsonwebtoken");

//Authentication middleware to verify JWT token
const auth = (req, res, next) => { 
  const header = req.headers.authorization || ""; //get authorization header 
  const token = header.startsWith("Bearer ") ? header.slice(7) : null; //extract token from header
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET); //verify token and get payload
    req.user = payload; // { id, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = { auth };
