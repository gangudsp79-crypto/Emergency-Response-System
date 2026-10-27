const express = require("express");
const mongoose = require("mongoose");
const Emergency = require("../models/Emergency");
const Ambulance = require("../models/Ambulance");
const Hospital = require("../models/Hospital");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Helper to check valid Mongo ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 1. Report new emergency (Citizen & all authenticated users)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, description, severity, latitude, longitude } = req.body;

    // Field presence validation
    if (!type || !description || !severity || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "All fields are required: type, description, severity, latitude, longitude"
      });
    }

    // Severity validation
    const validSeverities = ["Low", "Medium", "High", "Critical"];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        message: `Invalid severity level. Must be one of: ${validSeverities.join(", ")}`
      });
    }

    // Coordinate validation
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ message: "Latitude must be a valid number between -90 and 90" });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Longitude must be a valid number between -180 and 180" });
    }

    if (description.trim().length < 3) {
      return res.status(400).json({ message: "Description must be at least 3 characters long" });
    }

    const emergency = await Emergency.create({
      type: type.trim(),
      description: description.trim(),
      severity,
      latitude: lat,
      longitude: lng,
      userId: req.userId
    });

    res.status(201).json({
      message: "Emergency reported successfully",
      emergency
    });
  } catch (error) {
    console.error("Create emergency error:", error);
    res.status(500).json({
      message: "Failed to create emergency",
      error: error.message
    });
  }
});

// 2. Get current user's emergencies
router.get("/", authMiddleware, async (req, res) => {
  try {
    const emergencies = await Emergency.find({ userId: req.userId })
      .populate("hospitalId")
      .populate("ambulanceId")
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (error) {
    console.error("Get user emergencies error:", error);
    res.status(500).json({ message: "Failed to get emergencies" });
  }
});

// 3. Get all emergencies (Admin & Dispatcher only)
router.get(
  "/all",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const emergencies = await Emergency.find()
        .populate("hospitalId")
        .populate("ambulanceId")
        .populate("userId", "name email phone")
        .sort({ createdAt: -1 });

      res.json(emergencies);
    } catch (error) {
      console.error("Get all emergencies error:", error);
      res.status(500).json({ message: "Failed to get emergencies" });
    }
  }
);

// 4. Assign hospital to emergency
router.patch(
  "/:id/assign-hospital",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { hospitalId } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid emergency ID" });
      }
      if (!isValidObjectId(hospitalId)) {
        return res.status(400).json({ message: "Invalid hospital ID" });
      }

      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
      }

      const existingEmergency = await Emergency.findById(id);
      if (!existingEmergency) {
        return res.status(404).json({ message: "Emergency not found" });
      }

      const newStatus = existingEmergency.status === "Active" ? "Responding" : existingEmergency.status;

      const emergency = await Emergency.findByIdAndUpdate(
        id,
        {
          hospitalId,
          status: newStatus
        },
        { new: true, runValidators: true }
      )
        .populate("hospitalId")
        .populate("ambulanceId");

      res.json({
        message: "Hospital assigned successfully",
        emergency
      });
    } catch (error) {
      console.error("Assign hospital error:", error);
      res.status(500).json({ message: "Failed to assign hospital" });
    }
  }
);

// 5. Update emergency status (and release ambulance if Resolved)
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid emergency ID" });
      }

      const validStatuses = ["Active", "Responding", "Resolved"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        });
      }

      const existingEmergency = await Emergency.findById(id);
      if (!existingEmergency) {
        return res.status(404).json({ message: "Emergency not found" });
      }

      // Update emergency status
      const emergency = await Emergency.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      )
        .populate("hospitalId")
        .populate("ambulanceId");

      // Critical requirement: If resolved and an ambulance was assigned, release the ambulance back to Available
      if (status === "Resolved" && existingEmergency.ambulanceId) {
        await Ambulance.findByIdAndUpdate(existingEmergency.ambulanceId, {
          status: "Available",
          emergencyId: null
        });
      }

      res.json({
        message: "Emergency status updated successfully",
        emergency
      });
    } catch (error) {
      console.error("Update emergency status error:", error);
      res.status(500).json({ message: "Failed to update emergency status" });
    }
  }
);

module.exports = router;