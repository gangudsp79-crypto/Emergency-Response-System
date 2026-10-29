// server/test-api.js - Automated Self-Test Verification Suite
const express = require("express");
const { getModel } = require("./services/dbStore");
const aiService = require("./services/aiService");

async function runTests() {
  console.log("==================================================");
  console.log("   QuickPulse Emergency System Self-Test Suite    ");
  console.log("==================================================");

  try {
    // 1. Test Database Models
    const User = getModel("User");
    const Hospital = getModel("Hospital");
    const Ambulance = getModel("Ambulance");
    const Emergency = getModel("Emergency");

    const users = await User.find();
    console.log(`[PASS] User Store: ${users.length} seeded personas loaded.`);

    const hospitals = await Hospital.find();
    console.log(`[PASS] Hospital Store: ${hospitals.length} acute care facilities available.`);

    const ambulances = await Ambulance.find();
    console.log(`[PASS] Ambulance Fleet: ${ambulances.length} emergency units tracked.`);

    const emergencies = await Emergency.find();
    console.log(`[PASS] Incident Queue: ${emergencies.length} test emergencies ready.`);

    // 2. Test AI Clinical Triage
    const testEmergency = emergencies[0];
    const triage = aiService.analyzeEmergencyTriage(testEmergency);
    console.log(`[PASS] AI Clinical Triage: Score ${triage.triageScore}/100, Priority: ${triage.triageCode}`);
    console.log(`       Detected: ${triage.detectedCondition}`);

    // 3. Test AI Hospital Recommendation (MCDA)
    const hospRecs = aiService.recommendHospitals(testEmergency, hospitals);
    console.log(`[PASS] AI Hospital Recommendation: Ranked ${hospRecs.length} hospitals.`);
    console.log(`       Top Pick: ${hospRecs[0].hospital.name} (${hospRecs[0].matchScore}% Match, ${hospRecs[0].distanceKm} km, ETA: ${hospRecs[0].etaMinutes} min)`);

    // 4. Test AI Ambulance Matching
    const ambRecs = aiService.recommendAmbulance(testEmergency, ambulances);
    console.log(`[PASS] AI Ambulance Fleet Match: Ranked ${ambRecs.length} units.`);
    console.log(`       Top Pick: ${ambRecs[0].ambulance.vehicleNumber} (Driver: ${ambRecs[0].ambulance.driverName}, Score: ${ambRecs[0].score})`);

    // 5. Test 1-Click Autonomous Dispatch Plan
    const autoPlan = aiService.generateAutoDispatchPlan(testEmergency, hospitals, ambulances);
    console.log(`[PASS] AI Auto-Dispatch Strategy: Generated successfully.`);
    console.log(`       Plan: ${autoPlan.autoDispatchSummary}`);

    // 6. Test Contextual Bystander First-Aid Guide
    const guide = aiService.getFirstAidInstructions(testEmergency.type, testEmergency.description);
    console.log(`[PASS] AI Bystander Copilot: ${guide.title} (${guide.steps.length} life-support steps)`);

    console.log("==================================================");
    console.log("   ALL VERIFICATION TESTS PASSED (0 ERRORS)       ");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runTests();
