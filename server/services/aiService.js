// server/services/aiService.js - Intelligent Emergency Triage and Dispatch Engine

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 10.0;
  }
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Calculate estimated emergency driving time in minutes
function estimateDrivingTimeMinutes(distanceKm) {
  // Average emergency response speed: ~40 km/h in urban/suburban with siren
  const speedKmH = 42;
  const hours = distanceKm / speedKmH;
  const minutes = Math.max(2, Math.round(hours * 60 + 1)); // At least 2 min
  return minutes;
}

// 1. AI Emergency Clinical Triage & Symptom Evaluation
function analyzeEmergencyTriage(emergencyData) {
  const { type = "Accident", description = "", severity = "Medium", patientVitals = {} } = emergencyData;
  const text = (description + " " + type).toLowerCase();

  let triageScore = 50; // default base score (0-100)
  let detectedCondition = "General Emergency Trauma";
  let primaryRisk = "Elevated clinical concern requiring on-site evaluation";
  let triageCode = "Code Yellow (Urgent)";
  let badgeColor = "#F59E0B";
  const clinicalFlags = [];
  const recommendedSpecialties = ["Emergency Medicine"];

  // Base score from user severity
  if (severity === "Critical") triageScore += 30;
  else if (severity === "High") triageScore += 20;
  else if (severity === "Medium") triageScore += 10;
  else if (severity === "Low") triageScore += 0;

  // NLP symptom / risk keyword parsing
  const cardiacKeywords = ["chest pain", "heart", "cardiac", "attack", "angina", "pulse", "palpitations"];
  const neuroKeywords = ["unconscious", "head injury", "fainted", "seizure", "coma", "concussion", "stroke", "paralysis"];
  const traumaKeywords = ["blood", "bleeding", "crush", "fracture", "bone", "collision", "accident", "stab", "amputation"];
  const respiratoryKeywords = ["breathing", "choke", "choking", "suffocating", "asthma", "gasping", "cyanosis"];
  const burnKeywords = ["fire", "burn", "explosion", "scalding", "smoke", "chemical"];

  if (cardiacKeywords.some((k) => text.includes(k))) {
    triageScore += 20;
    clinicalFlags.push("Possible Acute Coronary Syndrome / Arrhythmia");
    recommendedSpecialties.push("Cardiology", "Cardiac ICU / Cath Lab");
    detectedCondition = "Suspected Cardiac Crisis";
  }

  if (neuroKeywords.some((k) => text.includes(k))) {
    triageScore += 25;
    clinicalFlags.push("Severe Neurological Compromise / Loss of Consciousness");
    recommendedSpecialties.push("Neurology", "Neuro-Trauma ICU");
    detectedCondition = "Altered Mental Status / Traumatic Brain Injury";
  }

  if (traumaKeywords.some((k) => text.includes(k))) {
    triageScore += 18;
    clinicalFlags.push("Active Hemorrhage / Musculoskeletal Trauma");
    recommendedSpecialties.push("Trauma Surgery", "Orthopedics");
    if (!detectedCondition || detectedCondition === "General Emergency Trauma") {
      detectedCondition = "High-Energy Impact Trauma";
    }
  }

  if (respiratoryKeywords.some((k) => text.includes(k))) {
    triageScore += 22;
    clinicalFlags.push("Acute Respiratory Distress / Airway Obstruction Risk");
    recommendedSpecialties.push("Pulmonology", "Critical Care Resuscitation");
    detectedCondition = "Severe Respiratory Failure";
  }

  if (burnKeywords.some((k) => text.includes(k))) {
    triageScore += 18;
    clinicalFlags.push("Thermal Trauma / Smoke Inhalation Risk");
    recommendedSpecialties.push("Burns Unit", "Plastic & Reconstructive Surgery");
    detectedCondition = "Thermal / Burn Emergency";
  }

  // Patient vitals analysis if provided
  if (patientVitals.conscious === false) {
    triageScore += 20;
    clinicalFlags.push("Unresponsive Patient (GCS < 8)");
  }
  if (patientVitals.bleeding === true) {
    triageScore += 15;
    clinicalFlags.push("Severe Uncontrolled External Bleeding");
  }
  if (patientVitals.pulse && (patientVitals.pulse < 50 || patientVitals.pulse > 130)) {
    triageScore += 15;
    clinicalFlags.push(`Abnormal Heart Rate (${patientVitals.pulse} BPM)`);
  }

  // Cap score between 10 and 100
  triageScore = Math.min(100, Math.max(10, triageScore));

  // Determine triage code & priority
  if (triageScore >= 80) {
    triageCode = "Code Red (Immediate / Life-Threatening)";
    badgeColor = "#EF4444";
    primaryRisk = "Imminent risk to life or permanent organ damage. Requires immediate resuscitation.";
  } else if (triageScore >= 55) {
    triageCode = "Code Yellow (Urgent)";
    badgeColor = "#F59E0B";
    primaryRisk = "Serious injury or illness requiring rapid medical intervention within minutes.";
  } else {
    triageCode = "Code Green (Standard)";
    badgeColor = "#10B981";
    primaryRisk = "Non-life-threatening condition; routine emergency transport indicated.";
  }

  return {
    triageScore,
    triageCode,
    badgeColor,
    detectedCondition,
    primaryRisk,
    clinicalFlags: clinicalFlags.length > 0 ? clinicalFlags : ["Standard clinical presentation"],
    recommendedSpecialties: Array.from(new Set(recommendedSpecialties)),
    timestamp: new Date().toISOString()
  };
}

// 2. AI Multi-Criteria Hospital Recommendation Engine
function recommendHospitals(emergency, hospitals) {
  if (!hospitals || hospitals.length === 0) return [];

  const triage = analyzeEmergencyTriage(emergency);
  const emergencyLat = Number(emergency.latitude);
  const emergencyLng = Number(emergency.longitude);

  const evaluated = hospitals.map((hosp) => {
    // Coordinates
    let hospLng = 0;
    let hospLat = 0;
    if (hosp.location?.coordinates?.length === 2) {
      hospLng = hosp.location.coordinates[0];
      hospLat = hosp.location.coordinates[1];
    }

    const distanceKm = calculateDistanceKm(emergencyLat, emergencyLng, hospLat, hospLng);
    const etaMinutes = estimateDrivingTimeMinutes(distanceKm);

    // Bed availability factor
    const availBeds = Number(hosp.availableBeds) || 0;
    const totalBeds = Number(hosp.totalBeds) || 1;
    const availIcu = Number(hosp.availableIcuBeds) || 0;
    const totalIcu = Number(hosp.totalIcuBeds) || 1;
    const emergencyAvailable = hosp.emergencyAvailable !== false;

    // Proximity Score (0 - 100)
    // 0 km = 100 pts, 25 km = 0 pts
    const proximityScore = Math.max(0, 100 - distanceKm * 4);

    // Bed & ICU Capacity Score (0 - 100)
    const bedRatio = availBeds / Math.max(totalBeds, 1);
    const icuRatio = availIcu / Math.max(totalIcu, 1);
    let capacityScore = bedRatio * 50 + icuRatio * 50;
    if (!emergencyAvailable) capacityScore = 0; // Diverting patients

    // Specialty Match Score (0 - 100)
    const facilities = Array.isArray(hosp.facilities) ? hosp.facilities : [];
    let matchCount = 0;
    triage.recommendedSpecialties.forEach((spec) => {
      if (facilities.some((f) => f.toLowerCase().includes(spec.toLowerCase()))) {
        matchCount++;
      }
    });
    const specialtyScore = Math.min(100, 40 + matchCount * 30);

    // Weighted multi-criteria score
    // 35% proximity, 30% capacity, 25% specialty match, 10% emergency readiness
    let totalScore =
      0.35 * proximityScore +
      0.30 * capacityScore +
      0.25 * specialtyScore +
      0.10 * (emergencyAvailable ? 100 : 0);

    // Severe penalty if no available beds
    if (availBeds <= 0 && availIcu <= 0) {
      totalScore = Math.max(10, totalScore - 40);
    }

    const finalMatchScore = Math.round(Math.min(99, Math.max(15, totalScore)));

    // Generate explainable AI justification
    let reasoning = "";
    if (!emergencyAvailable) {
      reasoning = `Emergency department currently diverting or at full capacity. Located ${distanceKm} km away (${etaMinutes} min ETA).`;
    } else if (finalMatchScore >= 80) {
      reasoning = `Optimal match! Only ${distanceKm} km away (${etaMinutes} min transit). Has ${availIcu} open ICU beds and ${availBeds} general beds. Fully equipped for ${triage.detectedCondition}.`;
    } else if (finalMatchScore >= 60) {
      reasoning = `Strong candidate at ${distanceKm} km (${etaMinutes} min ETA). ${availBeds} beds available. Can provide acute care.`;
    } else {
      reasoning = `Secondary option located ${distanceKm} km away (${etaMinutes} min ETA). Limited specialty or capacity.`;
    }

    return {
      hospital: hosp,
      matchScore: finalMatchScore,
      distanceKm,
      etaMinutes,
      availBeds,
      availIcu,
      emergencyAvailable,
      aiReasoning: reasoning
    };
  });

  // Sort descending by matchScore
  return evaluated.sort((a, b) => b.matchScore - a.matchScore);
}

// 3. AI Smart Ambulance Dispatch Optimizer
function recommendAmbulance(emergency, ambulances) {
  if (!ambulances || ambulances.length === 0) return [];

  const emergencyLat = Number(emergency.latitude);
  const emergencyLng = Number(emergency.longitude);

  const evaluated = ambulances.map((amb) => {
    let ambLng = emergencyLng + (Math.random() - 0.5) * 0.05;
    let ambLat = emergencyLat + (Math.random() - 0.5) * 0.05;

    if (amb.currentLocation?.coordinates?.length === 2 && amb.currentLocation.coordinates[0] !== 0) {
      ambLng = amb.currentLocation.coordinates[0];
      ambLat = amb.currentLocation.coordinates[1];
    }

    const distanceKm = calculateDistanceKm(emergencyLat, emergencyLng, ambLat, ambLng);
    const etaMinutes = estimateDrivingTimeMinutes(distanceKm);
    const isAvailable = amb.status === "Available";

    // Readiness score
    let score = isAvailable ? 100 - distanceKm * 6 : 20 - distanceKm * 4;
    score = Math.round(Math.min(99, Math.max(10, score)));

    let reasoning = "";
    if (isAvailable) {
      reasoning = `Unit ${amb.vehicleNumber} (Driver: ${amb.driverName}) is free and ${distanceKm} km away. Estimated arrival time to scene: ${etaMinutes} minutes.`;
    } else {
      reasoning = `Unit ${amb.vehicleNumber} is currently ${amb.status} and not recommended for immediate dispatch.`;
    }

    return {
      ambulance: amb,
      distanceKm,
      etaMinutes,
      score,
      isAvailable,
      aiReasoning: reasoning
    };
  });

  // Sort by availability first, then score
  return evaluated.sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return b.score - a.score;
  });
}

// 4. One-Click AI Autonomous Dispatch Strategy
function generateAutoDispatchPlan(emergency, hospitals, ambulances) {
  const triage = analyzeEmergencyTriage(emergency);
  const rankedHospitals = recommendHospitals(emergency, hospitals);
  const rankedAmbulances = recommendAmbulance(emergency, ambulances);

  const bestHospital = rankedHospitals.length > 0 ? rankedHospitals[0] : null;
  const bestAmbulance = rankedAmbulances.find((a) => a.isAvailable) || (rankedAmbulances.length > 0 ? rankedAmbulances[0] : null);

  return {
    triage,
    recommendedHospital: bestHospital,
    recommendedAmbulance: bestAmbulance,
    autoDispatchSummary: `AI paired Ambulance ${bestAmbulance?.ambulance?.vehicleNumber || "Unit"} with ${bestHospital?.hospital?.name || "Hospital"}. Total estimated response time: ${bestAmbulance?.etaMinutes || 5} min to patient + ${bestHospital?.etaMinutes || 8} min to hospital.`,
    dispatchTimestamp: new Date().toISOString()
  };
}

// 5. Contextual First-Aid & Bystander Life Support Protocols
function getFirstAidInstructions(emergencyType = "Accident", description = "") {
  const text = (emergencyType + " " + description).toLowerCase();

  if (text.includes("heart") || text.includes("chest") || text.includes("cardiac")) {
    return {
      title: "Cardiac Emergency / Chest Pain Protocol",
      urgency: "CRITICAL - Act Immediately",
      icon: "HeartPulse",
      steps: [
        "Call out loudly for help and ensure someone has called the ambulance.",
        "Keep the patient calm and seated upright in a comfortable position (W-position).",
        "Loosen tight clothing around the neck, chest, and waist.",
        "If the patient is unconscious and not breathing normally, begin Hands-Only CPR immediately: Push hard and fast in the center of the chest (100–120 beats per minute, rhythm of 'Stayin' Alive').",
        "If an Automated External Defibrillator (AED) is nearby, send a bystander to bring it and follow spoken prompts."
      ],
      warnings: ["Do NOT give food or drink.", "Do NOT leave the patient unattended."]
    };
  }

  if (text.includes("bleed") || text.includes("cut") || text.includes("blood") || text.includes("stab")) {
    return {
      title: "Severe Bleeding & Hemorrhage Control",
      urgency: "HIGH - Control Blood Loss",
      icon: "ShieldAlert",
      steps: [
        "Apply direct, firm pressure over the bleeding wound using a clean cloth, towel, or sterile dressing.",
        "Maintain continuous pressure for at least 5 full minutes without lifting the cloth to check.",
        "If blood soaks through, add another cloth on top — do NOT remove the first one.",
        "Elevate the injured limb above heart level if no fractures are suspected.",
        "Keep the patient lying down, covered with a jacket or blanket to prevent hypothermia and shock."
      ],
      warnings: ["Do NOT remove deeply impaled objects; stabilize them in place.", "Do NOT apply a tourniquet unless trained and bleeding is uncontrollable on a limb."]
    };
  }

  if (text.includes("unconscious") || text.includes("faint") || text.includes("seizure") || text.includes("head")) {
    return {
      title: "Unconsciousness & Head Trauma Protocol",
      urgency: "HIGH - Protect Airway",
      icon: "AlertTriangle",
      steps: [
        "Check breathing: Look, listen, and feel for normal chest rise.",
        "If breathing normally, place in Recovery Position (roll gently onto their side, tilt head back slightly to keep airway clear).",
        "If a spinal or neck injury is suspected (e.g. vehicle collision or fall), do NOT move the patient unless immediate danger exists; stabilize head manually.",
        "If seizure occurs: Clear nearby hard objects, protect head with soft padding, and do NOT put anything in their mouth.",
        "Record the duration of unconsciousness or seizure for paramedics."
      ],
      warnings: ["Do NOT shake the patient or give water.", "Do NOT hold the patient down during a seizure."]
    };
  }

  if (text.includes("fire") || text.includes("burn") || text.includes("explosion")) {
    return {
      title: "Thermal Burn & Scald Protocol",
      urgency: "HIGH - Cool the Burn",
      icon: "Flame",
      steps: [
        "Remove the patient from danger and extinguish active flames (Stop, Drop, and Roll).",
        "Cool the burn under cool or lukewarm running water for 15 to 20 minutes.",
        "Gently remove rings, watches, or loose clothing near the burn before swelling begins.",
        "Cover loosely with sterile non-stick dressing or clean plastic wrap.",
        "Keep the patient warm to avoid hypothermia from prolonged cooling."
      ],
      warnings: ["Do NOT apply ice, butter, toothpaste, or ointments.", "Do NOT pop any blisters."]
    };
  }

  // Default Road Accident / Trauma
  return {
    title: "Accident Scene & Trauma Bystander Protocol",
    urgency: "IMMEDIATE - Scene Safety First",
    icon: "Car",
    steps: [
      "Ensure personal safety: Park away from traffic, activate hazard flashers, and beware of oncoming vehicles.",
      "Turn off the ignition of damaged vehicles if safely accessible to prevent fire.",
      "Do NOT pull victims out of a vehicle unless there is immediate threat of fire, explosion, or submersion.",
      "Check if victims are conscious and responsive; encourage them to remain still and not turn their neck.",
      "Apply direct pressure to any areas with heavy bleeding using clean clothing.",
      "Speak reassuringly to the injured person and inform them the ambulance has been dispatched."
    ],
    warnings: ["Do NOT remove helmets of injured motorcycle riders unless airway is blocked.", "Do NOT offer food, water, or medication."]
  };
}

// 6. AI Driver Tactical Navigation Guidance
function generateDriverGuidance(emergency, hospital, ambulance) {
  const distanceToPatient = calculateDistanceKm(
    ambulance?.currentLocation?.coordinates?.[1] || 12.302,
    ambulance?.currentLocation?.coordinates?.[0] || 76.645,
    emergency.latitude,
    emergency.longitude
  );

  const etaPatient = estimateDrivingTimeMinutes(distanceToPatient);

  let hospitalDistance = 4.0;
  let hospitalEta = 8;
  if (hospital?.location?.coordinates?.length === 2) {
    hospitalDistance = calculateDistanceKm(
      emergency.latitude,
      emergency.longitude,
      hospital.location.coordinates[1],
      hospital.location.coordinates[0]
    );
    hospitalEta = estimateDrivingTimeMinutes(hospitalDistance);
  }

  const triage = emergency.aiTriage || analyzeEmergencyTriage(emergency);

  return {
    patientEtaMinutes: etaPatient,
    patientDistanceKm: distanceToPatient,
    hospitalEtaMinutes: hospitalEta,
    hospitalDistanceKm: hospitalDistance,
    tacticalRouteNotes: [
      `Maintain emergency siren protocol: ETA to victim is ~${etaPatient} min (${distanceToPatient} km).`,
      `Target destination hospital: ${hospital?.name || "Nearest Trauma Center"} (~${hospitalEta} min transit from scene).`,
      `Hospital Bed Readiness: ${hospital?.availableBeds || 0} acute beds, ${hospital?.availableIcuBeds || 0} ICU beds available.`,
      `Clinical Advisory: ${triage.primaryRisk}`
    ],
    recommendedERDeskAction: `Alert ${hospital?.name || "Hospital"} ER triage team for incoming ${emergency.severity} trauma patient.`
  };
}

// 7. AI Hospital Intake Documentation Generator (Automating Hospital Admin Work)
function generateHospitalIntakePlan(emergency, hospital) {
  const triage = emergency.aiTriage || analyzeEmergencyTriage(emergency);
  const admittedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    intakeReference: `INTAKE-MYS-${emergency._id.slice(-6).toUpperCase()}`,
    patientName: emergency.userId?.name || "Emergency Patient",
    contactPhone: emergency.userId?.phone || "On-File",
    intakeTimestamp: new Date().toISOString(),
    admittedTimeFormatted: admittedTime,
    conditionSummary: triage.detectedCondition,
    urgencyPriority: triage.triageCode,
    aiSeverityScore: triage.triageScore,
    assignedFacility: hospital?.name || "Emergency Department",
    allocatedBedType: triage.triageScore >= 80 ? "ICU / Resuscitation Bay" : "Acute Trauma Bed",
    automatedPhysicianChecklist: [
      "Initial primary survey (Airway, Breathing, Circulation, Disability, Exposure)",
      triage.clinicalFlags?.[0] || "Continuous vital signs monitoring",
      `Specialist Consultation: ${triage.recommendedSpecialties?.[0] || "Emergency Surgery"} notified`,
      "STAT blood work, cross-match, and trauma imaging panel prepared"
    ],
    adminPaperworkReductionStatus: "Automated by QuickPulse AI Clinical Protocol"
  };
}

module.exports = {
  calculateDistanceKm,
  estimateDrivingTimeMinutes,
  analyzeEmergencyTriage,
  recommendHospitals,
  recommendAmbulance,
  generateAutoDispatchPlan,
  getFirstAidInstructions,
  generateDriverGuidance,
  generateHospitalIntakePlan
};

