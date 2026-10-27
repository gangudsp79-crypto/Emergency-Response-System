const express = require("express");
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const Emergency = require("../models/Emergency");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 1. ADD HOSPITAL (Admin only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const {
        name,
        address,
        location,
        phone,
        facilities,
        totalBeds,
        availableBeds,
        totalIcuBeds,
        availableIcuBeds,
        totalAmbulances,
        availableAmbulances,
        emergencyAvailable
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Hospital name is required" });
      }

      if (!address || !address.city || !address.state) {
        return res.status(400).json({ message: "City and State are required in address" });
      }

      if (
        !location ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length !== 2
      ) {
        return res.status(400).json({
          message: "Valid coordinates [longitude, latitude] are required"
        });
      }

      const [lng, lat] = location.coordinates.map(Number);
      if (isNaN(lng) || lng < -180 || lng > 180 || isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ message: "Coordinates values are out of bounds" });
      }

      const hospital = await Hospital.create({
        name: name.trim(),
        address: {
          street: address.street || "",
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode || ""
        },
        location: {
          type: "Point",
          coordinates: [lng, lat]
        },
        phone: phone || "",
        facilities: Array.isArray(facilities) ? facilities : [],
        totalBeds: Math.max(0, Number(totalBeds) || 0),
        availableBeds: Math.max(0, Number(availableBeds) || 0),
        totalIcuBeds: Math.max(0, Number(totalIcuBeds) || 0),
        availableIcuBeds: Math.max(0, Number(availableIcuBeds) || 0),
        totalAmbulances: Math.max(0, Number(totalAmbulances) || 0),
        availableAmbulances: Math.max(0, Number(availableAmbulances) || 0),
        emergencyAvailable: emergencyAvailable !== undefined ? Boolean(emergencyAvailable) : true
      });

      res.status(201).json({
        message: "Hospital added successfully",
        hospital
      });
    } catch (error) {
      console.error("Add hospital error:", error);
      res.status(500).json({
        message: "Failed to add hospital",
        error: error.message
      });
    }
  }
);

// 2. GET ALL HOSPITALS (Admin, Dispatcher, Citizen)
router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const hospitals = await Hospital.find().sort({ createdAt: -1 });
      res.json(hospitals);
    } catch (error) {
      console.error("Get hospitals error:", error);
      res.status(500).json({ message: "Failed to get hospitals" });
    }
  }
);

// 3. GET NEARBY HOSPITALS FOR EMERGENCY (Admin, Dispatcher)
router.get(
  "/nearby/:emergencyId",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const { emergencyId } = req.params;
      if (!isValidObjectId(emergencyId)) {
        return res.status(400).json({ message: "Invalid emergency ID" });
      }

      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        return res.status(404).json({ message: "Emergency not found" });
      }

      // Try finding hospitals within 50km
      let hospitals = [];
      try {
        hospitals = await Hospital.find({
          emergencyAvailable: true,
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [emergency.longitude, emergency.latitude]
              },
              $maxDistance: 50000 // 50 km
            }
          }
        });
      } catch (geoErr) {
        console.warn("Geospatial search warning:", geoErr.message);
      }

      // If no hospitals within 50km or index issue, fallback to all emergency-ready hospitals
      if (!hospitals || hospitals.length === 0) {
        hospitals = await Hospital.find({ emergencyAvailable: true }).limit(10);
      }

      res.json(hospitals);
    } catch (error) {
      console.error("Nearby hospitals error:", error);
      res.status(500).json({ message: "Failed to find nearby hospitals" });
    }
  }
);

// 4. GET ONE HOSPITAL
router.get(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid hospital ID" });
      }

      const hospital = await Hospital.findById(id);
      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
      }

      res.json(hospital);
    } catch (error) {
      console.error("Get hospital error:", error);
      res.status(500).json({ message: "Failed to get hospital" });
    }
  }
);

// 5. UPDATE HOSPITAL (Admin only)
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid hospital ID" });
      }

      const hospital = await Hospital.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
      }

      res.json({
        message: "Hospital updated successfully",
        hospital
      });
    } catch (error) {
      console.error("Update hospital error:", error);
      res.status(500).json({ message: "Failed to update hospital" });
    }
  }
);

// 6. DELETE HOSPITAL (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid hospital ID" });
      }

      const hospital = await Hospital.findByIdAndDelete(id);
      if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
      }

      res.json({ message: "Hospital deleted successfully" });
    } catch (error) {
      console.error("Delete hospital error:", error);
      res.status(500).json({ message: "Failed to delete hospital" });
    }
  }
);

module.exports = router;