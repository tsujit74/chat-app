import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  try {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;

    if (!token) {
      return res.status(401).json({ msg: "Token not found, please login again" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token, please login again" });
  }
};
