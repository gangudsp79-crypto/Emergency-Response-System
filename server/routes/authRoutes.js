const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

router.post("/google", async (req, res) => {
  try {
    // 1. Get Google credential from frontend
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required"
      });
    }

    // 2. Verify Google's ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    // 3. Get verified Google user information
    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const name = payload.name;
    const email = payload.email;
    const profilePicture = payload.picture;

    // 4. Find user in MongoDB
    let user = await User.findOne({ googleId });

    // 5. If user doesn't exist, create a new user
    if (!user) {
      user = await User.create({
        googleId,
        name,
        email,
        profilePicture
      });
    }

    // 6. Create our application's JWT
    const token = jwt.sign(
      {
        userId: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    // 7. Send JWT and user information to frontend
    res.json({
      message: "Google login successful",
      token,
      user
    });

  } catch (error) {
    console.error(
      "Google authentication error:",
      error
    );

    res.status(500).json({
      message: "Google authentication failed"
    });
  }
});

// Demo login for quick testing of roles (citizen, dispatcher, admin)
router.post("/demo-login", async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ["citizen", "dispatcher", "admin"];

    const selectedRole = allowedRoles.includes(role) ? role : "citizen";
    const googleId = `demo-${selectedRole}-id`;
    const email = `${selectedRole}@emergency.system`;
    const name = `${selectedRole.toUpperCase().charAt(0) + selectedRole.slice(1)} User`;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.create({
        googleId,
        name,
        email,
        role: selectedRole,
        profilePicture: ""
      });
    } else if (user.role !== selectedRole) {
      user.role = selectedRole;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "default_emergency_jwt_secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: `Logged in as ${selectedRole}`,
      token,
      user
    });
  } catch (error) {
    console.error("Demo login error:", error);
    res.status(500).json({ message: "Demo login failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    res.status(500).json({
      message: "Failed to get user"
    });
  }
});

router.get("/test-protected", authMiddleware, (req, res) => {
  res.json({
    message: "You are authenticated!",
    userId: req.userId
  });
});

module.exports = router;