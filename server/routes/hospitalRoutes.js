const express = require("express");
const { getModel } = require("../services/dbStore");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const aiService = require("../services/aiService");

const router = express.Router();
const isValidId = (id) => typeof id === "string" && id.length >= 8;

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

      let coordinates = [76.6450, 12.3020];
      if (
        location &&
        Array.isArray(location.coordinates) &&
        location.coordinates.length === 2
      ) {
        coordinates = location.coordinates.map(Number);
      }

      const Hospital = getModel("Hospital");
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
          coordinates
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
        message: "Hospital registered successfully",
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

// 2. GET ALL HOSPITALS (All authenticated users)
router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const Hospital = getModel("Hospital");
      const hospitals = await Hospital.find();
      const list = Array.isArray(hospitals) ? hospitals : [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(list);
    } catch (error) {
      console.error("Get hospitals error:", error);
      res.status(500).json({ message: "Failed to get hospitals" });
    }
  }
);

// 3. GET NEARBY HOSPITALS FOR EMERGENCY
router.get(
  "/nearby/:emergencyId",
  authMiddleware,
  roleMiddleware("admin", "dispatcher", "hospital"),
  async (req, res) => {
    try {
      const { emergencyId } = req.params;
      const Emergency = getModel("Emergency");
      const Hospital = getModel("Hospital");

      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        return res.status(404).json({ message: "Emergency not found" });
      }

      const allHospitals = await Hospital.find();
      const hospitals = Array.isArray(allHospitals) ? allHospitals : [];

      // Sort by proximity using haversine
      const sorted = hospitals
        .map((h) => {
          let lng = 76.6450;
          let lat = 12.3020;
          if (h.location?.coordinates?.length === 2) {
            lng = h.location.coordinates[0];
            lat = h.location.coordinates[1];
          }
          const dist = aiService.calculateDistanceKm(
            Number(emergency.latitude),
            Number(emergency.longitude),
            lat,
            lng
          );
          return { ...h, distanceKm: dist };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      res.json(sorted);
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
      const Hospital = getModel("Hospital");
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

// 5. QUICK BED & CAPACITY ADJUSTMENT (Hospital Doctor / Staff & Admin)
router.patch(
  "/:id/capacity",
  authMiddleware,
  roleMiddleware("admin", "hospital", "dispatcher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { availableBeds, availableIcuBeds, emergencyAvailable } = req.body;

      const Hospital = getModel("Hospital");
      const current = await Hospital.findById(id);
      if (!current) return res.status(404).json({ message: "Hospital not found" });

      const updateData = {};
      if (availableBeds !== undefined) {
        updateData.availableBeds = Math.max(0, Math.min(current.totalBeds, Number(availableBeds)));
      }
      if (availableIcuBeds !== undefined) {
        updateData.availableIcuBeds = Math.max(0, Math.min(current.totalIcuBeds, Number(availableIcuBeds)));
      }
      if (emergencyAvailable !== undefined) {
        updateData.emergencyAvailable = Boolean(emergencyAvailable);
      }

      const hospital = await Hospital.findByIdAndUpdate(id, updateData);
      res.json({
        message: "Hospital capacity updated",
        hospital
      });
    } catch (error) {
      console.error("Update capacity error:", error);
      res.status(500).json({ message: "Failed to update hospital capacity" });
    }
  }
);

// 6. UPDATE HOSPITAL (Admin only)
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "hospital"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const Hospital = getModel("Hospital");
      const hospital = await Hospital.findByIdAndUpdate(id, req.body);

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

// 7. DELETE HOSPITAL (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const Hospital = getModel("Hospital");
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
