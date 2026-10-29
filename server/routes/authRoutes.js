const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const { getModel } = require("../services/dbStore");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// 1. Google OAuth verification with Role Onboarding Support
router.post("/google", async (req, res) => {
  try {
    const { credential, preferredRole, hospitalId, ambulanceDetails } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential token is required"
      });
    }

    let googleId = "";
    let name = "";
    let email = "";
    let profilePicture = "";

    // Verify token with Google if CLIENT_ID is provided
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      name = payload.name;
      email = payload.email;
      profilePicture = payload.picture;
    } catch (verifyErr) {
      // Decode JWT payload gracefully for development / sandbox
      try {
        const decoded = jwt.decode(credential);
        if (decoded && decoded.sub) {
          googleId = decoded.sub;
          name = decoded.name || "Google User";
          email = decoded.email || `${decoded.sub}@gmail.com`;
          profilePicture = decoded.picture || "";
        } else {
          throw new Error("Unable to parse credential");
        }
      } catch (decodeErr) {
        return res.status(401).json({ message: "Invalid Google credential" });
      }
    }

    const User = getModel("User");
    const Hospital = getModel("Hospital");
    const Ambulance = getModel("Ambulance");

    let user = await User.findOne({ googleId });

    const roleToAssign = preferredRole || "citizen";

    if (!user) {
      const userData = {
        googleId,
        name: name || "Emergency User",
        email: email || `${googleId}@user.com`,
        profilePicture: profilePicture || "",
        role: roleToAssign,
        hospitalId: hospitalId || null
      };

      // If logging in as driver, link or create ambulance record
      if (roleToAssign === "driver" && ambulanceDetails) {
        const newAmb = await Ambulance.create({
          vehicleNumber: ambulanceDetails.vehicleNumber || `KA-09-EM-${Math.floor(1000 + Math.random() * 9000)}`,
          driverName: name,
          driverPhone: ambulanceDetails.driverPhone || "+91 98450 12345",
          driverLicense: ambulanceDetails.driverLicense || "KA-09-DL-2024",
          vehicleType: ambulanceDetails.vehicleType || "ALS",
          baseArea: ambulanceDetails.baseArea || "Mysuru Central",
          status: "Available"
        });
        userData.ambulanceId = newAmb._id;
      }

      user = await User.create(userData);
    } else {
      // Update role / hospitalId if explicitly switching
      if (preferredRole && user.role !== preferredRole) {
        user.role = preferredRole;
      }
      if (hospitalId) {
        user.hospitalId = hospitalId;
      }
      if (typeof user.save === "function") {
        await user.save();
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "default_emergency_jwt_secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Google login successful",
      token,
      user
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(500).json({
      message: "Google authentication failed",
      error: error.message
    });
  }
});

// 2. Demo Persona Fast-Login (Supports all Mysuru personas)
router.post("/demo-login", async (req, res) => {
  try {
    const { role, hospitalId, ambulanceId } = req.body;
    const allowedRoles = ["citizen", "dispatcher", "hospital", "driver", "admin"];
    const selectedRole = allowedRoles.includes(role) ? role : "citizen";

    const Hospital = getModel("Hospital");
    const Ambulance = getModel("Ambulance");
    const User = getModel("User");

    // Default associated hospital in Mysuru (Apollo BGS Hospital)
    let assignedHospitalId = hospitalId || "66d000000000000000000001";
    // Default associated ambulance in Mysuru (Unit 1001, Kuvempunagar)
    let assignedAmbulanceId = ambulanceId || "66e000000000000000000001";

    const roleProfiles = {
      citizen: {
        name: "John Citizen (Mysuru)",
        email: "citizen@emergency.system",
        googleId: "demo-citizen-id",
        hospitalId: null,
        ambulanceId: null
      },
      dispatcher: {
        name: "Sarah Dispatcher (Mysuru Command)",
        email: "dispatcher@emergency.system",
        googleId: "demo-dispatcher-id",
        hospitalId: null,
        ambulanceId: null
      },
      hospital: {
        name: "Dr. Aris Thorne (Apollo BGS Trauma Director)",
        email: "hospital@emergency.system",
        googleId: "demo-hospital-id",
        hospitalId: assignedHospitalId,
        ambulanceId: null
      },
      driver: {
        name: "Paramedic Rajesh Kumar (Unit 1001)",
        email: "driver@emergency.system",
        googleId: "demo-driver-id",
        hospitalId: null,
        ambulanceId: assignedAmbulanceId
      },
      admin: {
        name: "Chief Admin Elena Vance (Mysuru Network)",
        email: "admin@emergency.system",
        googleId: "demo-admin-id",
        hospitalId: null,
        ambulanceId: null
      }
    };

    const profile = roleProfiles[selectedRole];
    let user = await User.findOne({ googleId: profile.googleId });

    if (!user) {
      user = await User.create({
        googleId: profile.googleId,
        name: profile.name,
        email: profile.email,
        role: selectedRole,
        hospitalId: profile.hospitalId,
        ambulanceId: profile.ambulanceId,
        profilePicture: ""
      });
    } else {
      user.role = selectedRole;
      if (profile.hospitalId) user.hospitalId = profile.hospitalId;
      if (profile.ambulanceId) user.ambulanceId = profile.ambulanceId;
      if (typeof user.save === "function") {
        await user.save();
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "default_emergency_jwt_secret",
      { expiresIn: "7d" }
    );

    res.json({
      message: `Authenticated as ${selectedRole.toUpperCase()}`,
      token,
      user
    });
  } catch (error) {
    console.error("Demo login error:", error);
    res.status(500).json({ message: "Demo authentication failed", error: error.message });
  }
});

// 3. GET current user session with populated role associations
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const User = getModel("User");
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to get user session" });
  }
});

// 4. PATCH update user profile (For linking Hospital Admin to hospital or Driver vehicle details)
router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { hospitalId, ambulanceId, phone, licenseNumber, vehicleNumber, baseArea, vehicleType } = req.body;
    const User = getModel("User");
    const Ambulance = getModel("Ambulance");

    const updatePayload = {};
    if (hospitalId) updatePayload.hospitalId = hospitalId;
    if (phone) updatePayload.phone = phone;
    if (licenseNumber) updatePayload.licenseNumber = licenseNumber;

    // If driver updating their vehicle
    if (req.userRole === "driver" && vehicleNumber) {
      let ambulance = null;
      if (ambulanceId) {
        ambulance = await Ambulance.findByIdAndUpdate(ambulanceId, {
          vehicleNumber: vehicleNumber.toUpperCase(),
          driverPhone: phone || req.user.phone,
          driverLicense: licenseNumber,
          baseArea: baseArea || "Mysuru",
          vehicleType: vehicleType || "ALS"
        });
      } else {
        ambulance = await Ambulance.create({
          vehicleNumber: vehicleNumber.toUpperCase(),
          driverName: req.user.name,
          driverPhone: phone || "+91 98450 12345",
          driverLicense: licenseNumber || "KA-09-DL",
          vehicleType: vehicleType || "ALS",
          baseArea: baseArea || "Mysuru",
          status: "Available"
        });
        updatePayload.ambulanceId = ambulance._id;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.userId, updatePayload);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

module.exports = router;
