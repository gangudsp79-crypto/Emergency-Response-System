// server/routes/aiRoutes.js - AI-Powered Emergency Triage & Dispatch Automation
const express = require("express");
const { getModel } = require("../services/dbStore");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const aiService = require("../services/aiService");

const router = express.Router();

// 1. POST /api/ai/triage - Clinical NLP Assessment & Urgency Scoring
router.post("/triage", authMiddleware, async (req, res) => {
  try {
    const { type, description, severity, patientVitals } = req.body;
    if (!description && !type) {
      return res.status(400).json({ message: "Incident details required for AI triage" });
    }

    const triage = aiService.analyzeEmergencyTriage({
      type: type || "Accident",
      description: description || "",
      severity: severity || "Medium",
      patientVitals: patientVitals || {}
    });

    res.json({
      success: true,
      triage
    });
  } catch (error) {
    console.error("AI Triage error:", error);
    res.status(500).json({ message: "AI triage processing failed", error: error.message });
  }
});

// 2. GET /api/ai/recommend-hospital/:emergencyId - Multi-Criteria Hospital Recommendation
router.get("/recommend-hospital/:emergencyId", authMiddleware, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const Emergency = getModel("Emergency");
    const Hospital = getModel("Hospital");

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: "Emergency incident not found" });
    }

    const hospitals = await Hospital.find();
    const recommendations = aiService.recommendHospitals(emergency, hospitals);

    res.json({
      success: true,
      emergencyId,
      recommendations
    });
  } catch (error) {
    console.error("AI Hospital Recommendation error:", error);
    res.status(500).json({ message: "Failed to generate hospital recommendations", error: error.message });
  }
});

// 3. GET /api/ai/recommend-ambulance/:emergencyId - Smart Ambulance Proximity & Readiness Match
router.get("/recommend-ambulance/:emergencyId", authMiddleware, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const Emergency = getModel("Emergency");
    const Ambulance = getModel("Ambulance");

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: "Emergency incident not found" });
    }

    const ambulances = await Ambulance.find();
    const recommendations = aiService.recommendAmbulance(emergency, ambulances);

    res.json({
      success: true,
      emergencyId,
      recommendations
    });
  } catch (error) {
    console.error("AI Ambulance Recommendation error:", error);
    res.status(500).json({ message: "Failed to generate ambulance recommendations", error: error.message });
  }
});

// 4. POST /api/ai/auto-dispatch/:emergencyId - Autonomous 1-Click Dispatch
router.post(
  "/auto-dispatch/:emergencyId",
  authMiddleware,
  roleMiddleware("admin", "dispatcher"),
  async (req, res) => {
    try {
      const { emergencyId } = req.params;
      const Emergency = getModel("Emergency");
      const Hospital = getModel("Hospital");
      const Ambulance = getModel("Ambulance");

      const emergency = await Emergency.findById(emergencyId);
      if (!emergency) {
        return res.status(404).json({ message: "Emergency incident not found" });
      }

      if (emergency.status === "Resolved") {
        return res.status(400).json({ message: "Cannot auto-dispatch to a resolved emergency" });
      }

      const hospitals = await Hospital.find();
      const ambulances = await Ambulance.find();

      const plan = aiService.generateAutoDispatchPlan(emergency, hospitals, ambulances);

      if (!plan.recommendedHospital) {
        return res.status(400).json({ message: "No suitable hospital found in emergency network" });
      }
      if (!plan.recommendedAmbulance || !plan.recommendedAmbulance.isAvailable) {
        return res.status(400).json({ message: "No available ambulances on standby for autonomous dispatch" });
      }

      const assignedHospital = plan.recommendedHospital.hospital;
      const assignedAmbulance = plan.recommendedAmbulance.ambulance;

      // Update emergency
      const updatedEmergency = await Emergency.findByIdAndUpdate(
        emergencyId,
        {
          hospitalId: assignedHospital._id,
          ambulanceId: assignedAmbulance._id,
          status: "Responding",
          ambulanceStatus: "En Route",
          aiTriage: plan.triage
        },
        { new: true }
      );

      // Update ambulance to On Duty
      await Ambulance.findByIdAndUpdate(assignedAmbulance._id, {
        status: "On Duty",
        emergencyId: emergency._id
      });

      res.json({
        success: true,
        message: `AI Auto-Dispatch complete: ${assignedAmbulance.vehicleNumber} dispatched to ${assignedHospital.name}`,
        plan,
        emergency: updatedEmergency
      });
    } catch (error) {
      console.error("Auto-dispatch error:", error);
      res.status(500).json({ message: "Autonomous dispatch operation failed", error: error.message });
    }
  }
);

// 5. POST /api/ai/first-aid - Life Support Guidance for Bystanders
router.post("/first-aid", (req, res) => {
  try {
    const { emergencyType, description } = req.body;
    const guide = aiService.getFirstAidInstructions(emergencyType, description);
    res.json({
      success: true,
      guide
    });
  } catch (error) {
    console.error("First-aid guide error:", error);
    res.status(500).json({ message: "Failed to generate first-aid guide" });
  }
});

// 6. GET /api/ai/driver-guidance/:emergencyId - Real-time Paramedic Navigation & Action Guidance
router.get("/driver-guidance/:emergencyId", authMiddleware, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const Emergency = getModel("Emergency");
    const Hospital = getModel("Hospital");
    const Ambulance = getModel("Ambulance");

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ message: "Emergency not found" });

    let hospital = null;
    if (emergency.hospitalId) {
      const hId = emergency.hospitalId?._id || emergency.hospitalId;
      hospital = await Hospital.findById(hId);
    }

    let ambulance = null;
    if (emergency.ambulanceId) {
      const aId = emergency.ambulanceId?._id || emergency.ambulanceId;
      ambulance = await Ambulance.findById(aId);
    }

    const guidance = aiService.generateDriverGuidance(emergency, hospital, ambulance);

    res.json({
      success: true,
      guidance
    });
  } catch (error) {
    console.error("Driver guidance error:", error);
    res.status(500).json({ message: "Failed to generate driver guidance" });
  }
});

// 7. GET /api/ai/hospital-intake-summary/:emergencyId - AI Documentation Generator for Hospital Admin
router.get("/hospital-intake-summary/:emergencyId", authMiddleware, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const Emergency = getModel("Emergency");
    const Hospital = getModel("Hospital");

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) return res.status(404).json({ message: "Emergency not found" });

    let hospital = null;
    if (emergency.hospitalId) {
      const hId = emergency.hospitalId?._id || emergency.hospitalId;
      hospital = await Hospital.findById(hId);
    }

    const intakeSummary = aiService.generateHospitalIntakePlan(emergency, hospital);

    res.json({
      success: true,
      intakeSummary
    });
  } catch (error) {
    console.error("Hospital intake summary error:", error);
    res.status(500).json({ message: "Failed to generate hospital intake summary" });
  }
});

module.exports = router;

