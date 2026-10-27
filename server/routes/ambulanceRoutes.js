const express = require("express");
const mongoose = require("mongoose");
const Ambulance = require("../models/Ambulance");
const Emergency = require("../models/Emergency");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 1. GET ALL AMBULANCES (Admin & Dispatcher)
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.status) {
        filter.status = req.query.status;
      }

      const ambulances = await Ambulance.find(filter)
        .populate("emergencyId")
        .sort({ createdAt: -1 });

      res.json(ambulances);
    } catch (error) {
      console.error("Get ambulances error:", error);
      res.status(500).json({ message: "Failed to fetch ambulances" });
    }
  }
);

// 2. ASSIGN AMBULANCE TO EMERGENCY (Admin & Dispatcher)
router.patch(
  "/:id/assign",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { emergencyId } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid ambulance ID" });
      }
      if (!isValidObjectId(emergencyId)) {
        return res.status(400).json({ message: "Invalid emergency ID" });
      }

      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        return res.status(404).json({ message: "Emergency not found" });
      }

      const ambulance = await Ambulance.findByIdAndUpdate(
        id,
        {
          emergencyId,
          status: "On Duty"
        },
        { new: true, runValidators: true }
      ).populate("emergencyId");

      if (!ambulance) {
        return res.status(404).json({ message: "Ambulance not found" });
      }

      // Update emergency to Responding with assigned ambulance
      await Emergency.findByIdAndUpdate(emergencyId, {
        status: "Responding",
        ambulanceId: id
      });

      res.json({
        message: "Ambulance assigned successfully",
        ambulance
      });
    } catch (error) {
      console.error("Assign ambulance error:", error);
      res.status(500).json({ message: "Failed to assign ambulance" });
    }
  }
);

// 3. CREATE AMBULANCE (Admin only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { vehicleNumber, driverName, driverPhone, currentLocation } = req.body;

      if (!vehicleNumber || !vehicleNumber.trim()) {
        return res.status(400).json({ message: "Vehicle number is required" });
      }
      if (!driverName || !driverName.trim()) {
        return res.status(400).json({ message: "Driver name is required" });
      }
      if (!driverPhone || !driverPhone.trim()) {
        return res.status(400).json({ message: "Driver phone is required" });
      }

      // Check for duplicate vehicle number
      const existing = await Ambulance.findOne({
        vehicleNumber: vehicleNumber.trim().toUpperCase()
      });
      if (existing) {
        return res.status(400).json({
          message: `Ambulance with vehicle number ${vehicleNumber} already exists`
        });
      }

      const ambulanceData = {
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        status: "Available"
      };

      if (
        currentLocation &&
        Array.isArray(currentLocation.coordinates) &&
        currentLocation.coordinates.length === 2
      ) {
        ambulanceData.currentLocation = {
          type: "Point",
          coordinates: currentLocation.coordinates
        };
      }

      const ambulance = await Ambulance.create(ambulanceData);

      res.status(201).json({
        message: "Ambulance created successfully",
        ambulance
      });
    } catch (error) {
      console.error("Create ambulance error:", error);
      res.status(500).json({
        message: "Failed to create ambulance",
        error: error.message
      });
    }
  }
);

// 4. UPDATE AMBULANCE (Admin only)
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid ambulance ID" });
      }

      if (req.body.vehicleNumber) {
        req.body.vehicleNumber = req.body.vehicleNumber.trim().toUpperCase();
      }

      const ambulance = await Ambulance.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!ambulance) {
        return res.status(404).json({ message: "Ambulance not found" });
      }

      res.json({
        message: "Ambulance updated successfully",
        ambulance
      });
    } catch (error) {
      console.error("Update ambulance error:", error);
      res.status(500).json({ message: "Failed to update ambulance" });
    }
  }
);

// 5. DELETE AMBULANCE (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid ambulance ID" });
      }

      const ambulance = await Ambulance.findByIdAndDelete(id);
      if (!ambulance) {
        return res.status(404).json({ message: "Ambulance not found" });
      }

      res.json({ message: "Ambulance deleted successfully" });
    } catch (error) {
      console.error("Delete ambulance error:", error);
      res.status(500).json({ message: "Failed to delete ambulance" });
    }
  }
);

module.exports = router;