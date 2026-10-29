const jwt = require("jsonwebtoken");
const { getModel } = require("../services/dbStore");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_emergency_jwt_secret"
    );

    const User = getModel("User");
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    req.userId = user._id;
    req.userRole = user.role;
    req.user = user;

    next();

  } catch (error) {
    console.error("Auth error:", error.message);

    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

module.exports = authMiddleware;
