const jwt = require("jsonwebtoken");
const User = require("../models/user");

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  const secretKey = process.env.SECRET_KEY || "my-super-extra-secret-key";

  jwt.verify(token, secretKey, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      // Try to find user in DB, fallback to decoded token payload
      const curUser = await User.findById(decoded.id);
      req.user = curUser || { _id: decoded.id, id: decoded.id, email: decoded.email };
      next();
    } catch (dbErr) {
      // DB error — still allow with decoded token info
      req.user = { _id: decoded.id, id: decoded.id, email: decoded.email };
      next();
    }
  });
}

module.exports = authenticateToken;
