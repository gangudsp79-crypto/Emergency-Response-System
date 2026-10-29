const express = require("express");
const { getModel } = require("../services/dbStore");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const aiService = require("../services/aiService");

const router = express.Router();
const isValidId = (id) => typeof id === "string" && id.length >= 8;

// 1. Report new emergency complaint (Citizen / Any authenticated user)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, description, severity, latitude, longitude, patientVitals } = req.body;

    if (!type || !description || !severity || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "All fields are required: type, description, severity, latitude, longitude"
      });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Invalid latitude or longitude coordinates" });
    }

    if (description.trim().length < 3) {
      return res.status(400).json({ message: "Description must be at least 3 characters long" });
    }

    // AI Clinical Triage
    const aiTriage = aiService.analyzeEmergencyTriage({
      type: type.trim(),
      description: description.trim(),
      severity,
      patientVitals: patientVitals || {}
    });

    const Emergency = getModel("Emergency");
    const Hospital = getModel("Hospital");
    const Ambulance = getModel("Ambulance");

    // Pre-calculate top AI recommended hospital in Mysuru
    const allHospitals = await Hospital.find();
    const rankedHospitals = aiService.recommendHospitals(
      { type, description, severity, latitude: lat, longitude: lng },
      allHospitals
    );
    const topHospital = rankedHospitals.length > 0 ? rankedHospitals[0].hospital : null;

    // Automatically check for closest available ambulance in Mysuru
    const allAmbulances = await Ambulance.find();
    const rankedAmbulances = aiService.recommendAmbulance(
      { latitude: lat, longitude: lng },
      allAmbulances
    );
    const topAvailableAmbulance = rankedAmbulances.find((a) => a.isAvailable);

    const emergency = await Emergency.create({
      type: type.trim(),
      description: description.trim(),
      severity,
      latitude: lat,
      longitude: lng,
      userId: req.userId,
      patientVitals: patientVitals || {},
      aiTriage,
      status: "Active",
      ambulanceStatus: "Pending",
      hospitalId: topHospital ? topHospital._id : null,
      ambulanceId: null, // Will be linked when driver accepts or auto-dispatched
      userCelebrationSeen: false
    });

    res.status(201).json({
      message: "Emergency complaint raised successfully. Dispatched to nearby Mysuru ambulances.",
      emergency,
      aiTriage,
      suggestedHospital: topHospital,
      nearestAmbulanceRecommendation: topAvailableAmbulance
    });
  } catch (error) {
    console.error("Create emergency error:", error);
    res.status(500).json({
      message: "Failed to raise emergency complaint",
      error: error.message
    });
  }
});

// 2. Get current user's emergency complaints history
router.get("/", authMiddleware, async (req, res) => {
  try {
    const Emergency = getModel("Emergency");
    const emergencies = await Emergency.find({ userId: req.userId });

    const list = Array.isArray(emergencies) ? emergencies : [];
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(list);
  } catch (error) {
    console.error("Get user emergencies error:", error);
    res.status(500).json({ message: "Failed to get emergency history" });
  }
});

// 3. Get all emergencies (Admin, Dispatcher, Hospital staff, Ambulance drivers)
router.get(
  "/all",
  authMiddleware,
  roleMiddleware("admin", "dispatcher", "hospital", "driver"),
  async (req, res) => {
    try {
      const Emergency = getModel("Emergency");
      const emergencies = await Emergency.find();

      const list = Array.isArray(emergencies) ? emergencies : [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(list);
    } catch (error) {
      console.error("Get all emergencies error:", error);
      res.status(500).json({ message: "Failed to get emergencies" });
    }
  }
);

// 4. Get emergency complaints directed to or admitted at a specific hospital
router.get(
  "/hospital/:hospitalId",
  authMiddleware,
  roleMiddleware("admin", "dispatcher", "hospital"),
  async (req, res) => {
    try {
      const { hospitalId } = req.params;
      const Emergency = getModel("Emergency");
      const all = await Emergency.find();

      const filtered = all.filter((em) => {
        const hId = em.hospitalId?._id ? String(em.hospitalId._id) : String(em.hospitalId);
        return hId === String(hospitalId);
      });

      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(filtered);
    } catch (error) {
      console.error("Get hospital emergencies error:", error);
      res.status(500).json({ message: "Failed to get hospital emergencies" });
    }
  }
);

// 5. Driver Emergency Alert Feed (Active unassigned emergencies in Mysuru + emergencies assigned to this driver)
router.get(
  "/driver-requests",
  authMiddleware,
  roleMiddleware("driver", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const Emergency = getModel("Emergency");
      const all = await Emergency.find();

      const driverAmbulanceId = req.user.ambulanceId ? String(req.user.ambulanceId) : null;

      // Filter: Unassigned Active emergencies OR assigned to this driver's ambulance
      const requests = all.filter((em) => {
        const isUnassignedActive = em.status === "Active" && !em.ambulanceId;
        const isMyMission = driverAmbulanceId && (
          (em.ambulanceId?._id && String(em.ambulanceId._id) === driverAmbulanceId) ||
          (em.ambulanceId && String(em.ambulanceId) === driverAmbulanceId)
        );
        return isUnassignedActive || isMyMission;
      });

      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(requests);
    } catch (error) {
      console.error("Driver requests fetch error:", error);
      res.status(500).json({ message: "Failed to get emergency requests" });
    }
  }
);

// 6. Driver Accepts Emergency Response
router.patch(
  "/:id/driver-accept",
  authMiddleware,
  roleMiddleware("driver", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { ambulanceId } = req.body;

      const targetAmbulanceId = ambulanceId || req.user.ambulanceId;
      if (!targetAmbulanceId) {
        return res.status(400).json({ message: "Driver must have an assigned ambulance unit to accept" });
      }

      const Emergency = getModel("Emergency");
      const Ambulance = getModel("Ambulance");
      const Hospital = getModel("Hospital");

      const existingEmergency = await Emergency.findById(id);
      if (!existingEmergency) return res.status(404).json({ message: "Emergency incident not found" });

      // Determine or confirm best hospital using AI
      let hospitalId = existingEmergency.hospitalId?._id || existingEmergency.hospitalId;
      if (!hospitalId) {
        const allHospitals = await Hospital.find();
        const recs = aiService.recommendHospitals(existingEmergency, allHospitals);
        if (recs.length > 0) {
          hospitalId = recs[0].hospital._id;
        }
      }

      // Update emergency
      const updatedEmergency = await Emergency.findByIdAndUpdate(
        id,
        {
          status: "Responding",
          ambulanceStatus: "En Route to Scene",
          ambulanceId: targetAmbulanceId,
          hospitalId
        }
      );

      // Update ambulance to On Duty
      await Ambulance.findByIdAndUpdate(targetAmbulanceId, {
        status: "On Duty",
        emergencyId: id
      });

      res.json({
        message: "Emergency response accepted! En route to victim location.",
        emergency: updatedEmergency
      });
    } catch (error) {
      console.error("Driver accept error:", error);
      res.status(500).json({ message: "Failed to accept emergency response", error: error.message });
    }
  }
);

// 7. Paramedic Driver Stage Sequencer (En Route ➔ Arrived ➔ Transporting ➔ Delivered)
router.patch(
  "/:id/stage",
  authMiddleware,
  roleMiddleware("admin", "dispatcher", "driver", "hospital"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { stage } = req.body; // "En Route to Scene", "Arrived at Scene", "Transporting to Hospital", "Delivered"

      const Emergency = getModel("Emergency");
      const Ambulance = getModel("Ambulance");
      const Hospital = getModel("Hospital");

      const existing = await Emergency.findById(id);
      if (!existing) return res.status(404).json({ message: "Emergency not found" });

      const updatePayload = { ambulanceStatus: stage };

      // When patient is safely handed over at hospital
      if (stage === "Delivered") {
        updatePayload.status = "Resolved";
        updatePayload.resolvedAt = new Date().toISOString();
        updatePayload.userCelebrationSeen = false; // Trigger celebration message for the user!

        // Free ambulance unit
        const ambId = existing.ambulanceId?._id || existing.ambulanceId;
        if (ambId) {
          await Ambulance.findByIdAndUpdate(ambId, {
            status: "Available",
            emergencyId: null
          });
        }

        // Increment hospital's admitted patient intake count
        const hospId = existing.hospitalId?._id || existing.hospitalId;
        if (hospId) {
          const hosp = await Hospital.findById(hospId);
          if (hosp) {
            await Hospital.findByIdAndUpdate(hospId, {
              admittedPatientsCount: (hosp.admittedPatientsCount || 0) + 1,
              availableBeds: Math.max(0, (hosp.availableBeds || 1) - 1)
            });
          }
        }
      }

      const emergency = await Emergency.findByIdAndUpdate(id, updatePayload);

      res.json({
        message: `Mission progression updated: ${stage}`,
        emergency
      });
    } catch (error) {
      console.error("Update mission stage error:", error);
      res.status(500).json({ message: "Failed to update mission stage" });
    }
  }
);

// 8. User acknowledges life-saver celebration message
router.patch(
  "/:id/celebration-seen",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const Emergency = getModel("Emergency");
      await Emergency.findByIdAndUpdate(id, { userCelebrationSeen: true });
      res.json({ message: "Celebration acknowledged" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update celebration state" });
    }
  }
);

// 9. Assign hospital manually (Dispatcher / Admin)
router.patch(
  "/:id/assign-hospital",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { hospitalId } = req.body;

      const Emergency = getModel("Emergency");
      const emergency = await Emergency.findByIdAndUpdate(id, {
        hospitalId,
        status: "Responding"
      });

      res.json({ message: "Hospital assigned", emergency });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign hospital" });
    }
  }
);

// 10. Update emergency status
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("admin", "dispatcher", "hospital", "driver"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const Emergency = getModel("Emergency");
      const Ambulance = getModel("Ambulance");

      const existingEmergency = await Emergency.findById(id);
      if (!existingEmergency) return res.status(404).json({ message: "Emergency not found" });

      const updateData = { status };
      if (status === "Resolved") {
        updateData.resolvedAt = new Date().toISOString();
        updateData.ambulanceStatus = "Delivered";

        const ambId = existingEmergency.ambulanceId?._id || existingEmergency.ambulanceId;
        if (ambId) {
          await Ambulance.findByIdAndUpdate(ambId, {
            status: "Available",
            emergencyId: null
          });
        }
      }

      const emergency = await Emergency.findByIdAndUpdate(id, updateData);
      res.json({ message: "Status updated successfully", emergency });
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  }
);

module.exports = router;
