import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Ambulance,
  MapPin,
  Navigation,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Compass,
  Radio,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Edit,
  X,
  Zap,
  Check
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import EmergencyMap from "../components/EmergencyMap";
import { API_BASE } from "../config/api";

const MISSION_STAGES = [
  { id: "En Route to Scene", label: "En Route to Patient", icon: Navigation, desc: "Departing base, emergency siren active" },
  { id: "Arrived at Scene", label: "Arrived at Scene", icon: MapPin, desc: "Triage & stabilizing victim on-site" },
  { id: "Transporting to Hospital", label: "Heading to Hospital", icon: Ambulance, desc: "Patient secured on stretcher, transit under siren" },
  { id: "Delivered", label: "Handed Over at Hospital", icon: CheckCircle2, desc: "Patient transferred to hospital trauma team" }
];

export default function DriverDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [aiGuidance, setAiGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Driver Profile / Vehicle Edit Modal
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: "KA-09-EM-1001",
    driverName: "",
    driverPhone: "",
    driverLicense: "",
    vehicleType: "ALS",
    baseArea: "Kuvempunagar"
  });

  // 1. Fetch telemetry & active mission
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [ambRes, reqRes] = await Promise.all([
        axios.get(`${API_BASE}/ambulances`, { headers }),
        axios.get(`${API_BASE}/emergencies/driver-requests`, { headers })
      ]);

      setAmbulances(ambRes.data);
      setIncomingRequests(reqRes.data);

      let currentAmb = selectedAmbulance;
      // Match with user's assigned ambulanceId if available
      if (!currentAmb && user?.ambulanceId) {
        const aId = user.ambulanceId?._id || user.ambulanceId;
        currentAmb = ambRes.data.find((a) => String(a._id) === String(aId));
      }

      if (!currentAmb && ambRes.data.length > 0) {
        currentAmb = ambRes.data[0];
      } else if (currentAmb) {
        currentAmb = ambRes.data.find((a) => a._id === currentAmb._id) || currentAmb;
      }
      setSelectedAmbulance(currentAmb);

      // Check if this ambulance has an active assigned mission
      if (currentAmb) {
        const found = reqRes.data.find(
          (e) =>
            (e.ambulanceId?._id === currentAmb._id || e.ambulanceId === currentAmb._id) &&
            e.status !== "Resolved"
        );
        setActiveEmergency(found || null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load telemetry");
    } finally {
      setLoading(false);
    }
  }, [toast, selectedAmbulance, user?.ambulanceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch AI Driver Guidance when an active mission is loaded
  useEffect(() => {
    if (!activeEmergency) {
      setAiGuidance(null);
      return;
    }
    const fetchGuidance = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/ai/driver-guidance/${activeEmergency._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAiGuidance(res.data.guidance);
      } catch (err) {
        console.warn("AI Guidance fetch error:", err.message);
      }
    };
    fetchGuidance();
  }, [activeEmergency?._id, activeEmergency?.status]);

  // Driver Accepts Emergency Request
  const handleAcceptEmergency = async (emergencyId) => {
    if (!selectedAmbulance) return;
    try {
      setAcceptingId(emergencyId);
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/emergencies/${emergencyId}/driver-accept`,
        { ambulanceId: selectedAmbulance._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Emergency accepted! AI route calculated. Proceed to patient location.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept emergency response");
    } finally {
      setAcceptingId(null);
    }
  };

  // Paramedic Stage Sequencer (En Route ➔ Arrived ➔ Transporting ➔ Delivered)
  const handleStageClick = async (stageId) => {
    if (!activeEmergency) return;
    try {
      setUpdatingStage(true);
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_BASE}/emergencies/${activeEmergency._id}/stage`,
        { stage: stageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (stageId === "Delivered") {
        toast.success("Patient successfully transferred to trauma team! Unit is now Available in Mysuru.");
      } else {
        toast.success(`Mission progression updated: ${stageId}`);
      }

      fetchData();
    } catch (err) {
      toast.error("Failed to update mission stage");
    } finally {
      setUpdatingStage(false);
    }
  };

  // Open Vehicle Details Edit Modal
  const handleOpenVehicleModal = () => {
    if (!selectedAmbulance) return;
    setVehicleForm({
      vehicleNumber: selectedAmbulance.vehicleNumber || "KA-09-EM-1001",
      driverName: selectedAmbulance.driverName || user?.name || "",
      driverPhone: selectedAmbulance.driverPhone || user?.phone || "+91 98451 22340",
      driverLicense: selectedAmbulance.driverLicense || "KA-09-DL",
      vehicleType: selectedAmbulance.vehicleType || "ALS",
      baseArea: selectedAmbulance.baseArea || "Kuvempunagar"
    });
    setShowVehicleModal(true);
  };

  // Save Vehicle Details
  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!selectedAmbulance) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/ambulances/${selectedAmbulance._id}`,
        vehicleForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Vehicle and driver telemetry updated!");
      setShowVehicleModal(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to update vehicle details");
    }
  };

  // Filter unassigned emergency calls waiting for driver pickup
  const unassignedCalls = incomingRequests.filter(
    (e) => e.status === "Active" && !e.ambulanceId
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(17, 24, 39, 0.95) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "16px",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.4)"
            }}
          >
            <Ambulance size={28} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.6rem" }}>Ambulance Paramedic Mobile Command</h1>
              <span className="pulse-beacon" title="GPS Navigation Online" />
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Live emergency dispatch feed for Mysuru • AI hospital suggestions, turn-by-turn routing & life-saving runs.
            </p>
          </div>
        </div>

        {/* Action Controls & Ambulance Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={handleOpenVehicleModal} className="btn btn-outline btn-sm" style={{ borderColor: "#F59E0B", color: "#FBBF24" }}>
            <Edit size={14} /> Edit Vehicle Details
          </button>

          <div>
            <select
              className="form-select"
              style={{ minWidth: "240px", fontSize: "0.85rem", background: "var(--bg-input)" }}
              value={selectedAmbulance?._id || ""}
              onChange={(e) => {
                const found = ambulances.find((a) => a._id === e.target.value);
                if (found) setSelectedAmbulance(found);
              }}
            >
              {ambulances.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.vehicleNumber} ({a.driverName} • {a.baseArea})
                </option>
              ))}
            </select>
          </div>

          <button onClick={fetchData} className="btn btn-outline btn-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {selectedAmbulance && (
        <>
          {/* Vehicle Telemetry Strip */}
          <div className="stats-grid" style={{ marginBottom: "0px" }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>
                <Ambulance size={24} />
              </div>
              <div>
                <div className="stat-label">Vehicle Registration</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                  {selectedAmbulance.vehicleNumber}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  Type: <strong style={{ color: "#38BDF8" }}>{selectedAmbulance.vehicleType || "ALS"}</strong> • Base: {selectedAmbulance.baseArea || "Mysuru"}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0EA5E9" }}>
                <Compass size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-label">Assigned Paramedic</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF" }}>
                  {selectedAmbulance.driverName}
                </div>
                <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>{selectedAmbulance.driverPhone}</div>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon"
                style={{
                  background: selectedAmbulance.status === "Available" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: selectedAmbulance.status === "Available" ? "#10B981" : "#EF4444"
                }}
              >
                <Radio size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-label">Deployment Readiness</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: selectedAmbulance.status === "Available" ? "#34D399" : "#FBBF24" }}>
                  {selectedAmbulance.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <div className="stat-label">Pending Mysuru SOS Calls</div>
                <div className="stat-value">{unassignedCalls.length}</div>
              </div>
            </div>
          </div>

          {/* ACTIVE EMERGENCY MISSION CONSOLE */}
          {activeEmergency ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 0.9fr",
                gap: "24px",
                alignItems: "start"
              }}
            >
              {/* LEFT: Mission Directives & Step Sequencer */}
              <div className="card" style={{ border: "1px solid rgba(239, 68, 68, 0.4)", boxShadow: "0 0 25px rgba(239, 68, 68, 0.1)" }}>
                <div className="card-header" style={{ marginBottom: "16px" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#F87171", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      ACTIVE EMERGENCY MISSION
                    </span>
                    <h2 style={{ fontSize: "1.4rem", marginTop: "2px" }}>
                      {activeEmergency.type} - {activeEmergency.severity} Priority
                    </h2>
                  </div>
                  <span className="badge badge-responding">Responding</span>
                </div>

                {/* Patient & Incident Details */}
                <div
                  style={{
                    padding: "16px",
                    background: "var(--bg-input)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    marginBottom: "18px",
                    fontSize: "0.9rem"
                  }}
                >
                  <p style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "0.95rem" }}>
                    <strong>Incident Description:</strong> {activeEmergency.description}
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.825rem" }}>
                    <div>
                      <span style={{ color: "var(--text-dim)" }}>Victim GPS:</span>{" "}
                      <strong style={{ color: "#38BDF8" }}>
                        {activeEmergency.latitude?.toFixed(4)}, {activeEmergency.longitude?.toFixed(4)}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)" }}>Caller:</span>{" "}
                      <strong>{activeEmergency.userId?.name || "Bystander"}</strong>
                    </div>
                  </div>

                  {/* External Navigation Link */}
                  <div style={{ marginTop: "12px" }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeEmergency.latitude},${activeEmergency.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                      style={{ color: "#38BDF8", borderColor: "rgba(14, 165, 233, 0.4)" }}
                    >
                      <Navigation size={14} /> Open in Google Maps Turn-by-Turn
                    </a>
                  </div>
                </div>

                {/* AI Hospital Suggestion Card */}
                {activeEmergency.hospitalId && (
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(14, 165, 233, 0.12)",
                      border: "1px solid rgba(14, 165, 233, 0.35)",
                      borderRadius: "10px",
                      marginBottom: "20px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#38BDF8", fontWeight: 800, textTransform: "uppercase" }}>
                          <Sparkles size={14} /> AI-SUGGESTED OPTIMAL HOSPITAL (MYSURU)
                        </div>
                        <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF", marginTop: "2px" }}>
                          {activeEmergency.hospitalId.name}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {activeEmergency.hospitalId.address?.street}, {activeEmergency.hospitalId.address?.city}
                        </div>
                      </div>

                      {activeEmergency.hospitalId.phone && (
                        <a
                          href={`tel:${activeEmergency.hospitalId.phone}`}
                          className="btn btn-sm btn-success"
                        >
                          <Phone size={14} /> Call ER Desk
                        </a>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "14px", marginTop: "10px", fontSize: "0.8rem", color: "var(--text-main)" }}>
                      <span>Beds: <strong style={{ color: "#38BDF8" }}>{activeEmergency.hospitalId.availableBeds} Available</strong></span>
                      <span>•</span>
                      <span>ICU: <strong style={{ color: "#FBBF24" }}>{activeEmergency.hospitalId.availableIcuBeds} Ready</strong></span>
                      <span>•</span>
                      <span>Trauma Wing: <strong style={{ color: "#34D399" }}>Active</strong></span>
                    </div>

                    {aiGuidance?.tacticalRouteNotes?.[0] && (
                      <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", fontSize: "0.775rem", color: "var(--text-muted)" }}>
                        💡 <strong>AI Navigation Advisory:</strong> {aiGuidance.tacticalRouteNotes[0]}
                      </div>
                    )}
                  </div>
                )}

                {/* Paramedic Step Progression Buttons */}
                <div>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "12px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                    Mission Progression (Click Each Step as Completed)
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {MISSION_STAGES.map((stage, idx) => {
                      const Icon = stage.icon;
                      const currentStage = activeEmergency.ambulanceStatus || "En Route to Scene";
                      const isCurrent = currentStage === stage.id;
                      const isCompleted =
                        (currentStage === "Arrived at Scene" && stage.id === "En Route to Scene") ||
                        (currentStage === "Transporting to Hospital" && (stage.id === "En Route to Scene" || stage.id === "Arrived at Scene")) ||
                        (currentStage === "Delivered");

                      return (
                        <button
                          key={stage.id}
                          disabled={updatingStage}
                          onClick={() => handleStageClick(stage.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 18px",
                            borderRadius: "10px",
                            background: isCurrent
                              ? "rgba(245, 158, 11, 0.2)"
                              : isCompleted
                              ? "rgba(16, 185, 129, 0.15)"
                              : "var(--bg-input)",
                            border: `1px solid ${
                              isCurrent ? "#F59E0B" : isCompleted ? "#10B981" : "var(--border-color)"
                            }`,
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: isCurrent
                                  ? "#F59E0B"
                                  : isCompleted
                                  ? "#10B981"
                                  : "rgba(255,255,255,0.08)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Icon size={18} color="#FFFFFF" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#FFFFFF" }}>
                                Step {idx + 1}: {stage.label}
                              </div>
                              <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                                {stage.desc}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="badge badge-responding">Current Stage</span>
                          ) : isCompleted ? (
                            <span className="badge badge-resolved">Completed</span>
                          ) : (
                            <ArrowRight size={16} color="var(--text-dim)" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: Live Tactical Turn-by-Turn Map */}
              <div className="card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                    <Navigation size={18} color="#F59E0B" /> Mission Route Radar
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    Ambulance ➔ Incident ➔ Hospital
                  </span>
                </div>

                <EmergencyMap
                  interactive={false}
                  selectedLocation={{ latitude: activeEmergency.latitude, longitude: activeEmergency.longitude }}
                  selectedHospital={activeEmergency.hospitalId}
                  assignedAmbulance={selectedAmbulance}
                  height="460px"
                />
              </div>
            </div>
          ) : (
            /* Standby Card with Incoming Emergency Radar */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* If there are unassigned emergency complaints in Mysuru */}
              {unassignedCalls.length > 0 && (
                <div className="card" style={{ border: "2px solid #EF4444", boxShadow: "0 0 30px rgba(239, 68, 68, 0.2)" }}>
                  <div className="card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="pulse-beacon" />
                      <h2 style={{ fontSize: "1.3rem", color: "#F87171" }}>
                        Incoming Emergency Alerts Near You ({unassignedCalls.length})
                      </h2>
                    </div>
                    <span className="badge badge-active">Action Required</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {unassignedCalls.map((call) => (
                      <div
                        key={call._id}
                        style={{
                          padding: "16px",
                          background: "var(--bg-input)",
                          borderRadius: "10px",
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "14px"
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "260px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <strong style={{ fontSize: "1.05rem", color: "#FFFFFF" }}>{call.type}</strong>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F87171" }}>[{call.severity}]</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                              • {new Date(call.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                            {call.description}
                          </p>
                          <div style={{ fontSize: "0.775rem", color: "#38BDF8" }}>
                            Location: {call.latitude?.toFixed(4)}, {call.longitude?.toFixed(4)} • Caller: {call.userId?.name || "Citizen"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleAcceptEmergency(call._id)}
                          disabled={acceptingId === call._id}
                          className="btn btn-emergency btn-md"
                          style={{ minWidth: "210px", fontWeight: 800 }}
                        >
                          <CheckCircle2 size={16} />
                          {acceptingId === call._id ? "Accepting..." : "ACCEPT EMERGENCY RESPONSE"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready on Standby Banner */}
              <div className="card" style={{ textAlign: "center", padding: "50px 20px" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px"
                  }}
                >
                  <CheckCircle2 size={36} color="#10B981" />
                </div>
                <h2 style={{ fontSize: "1.35rem", marginBottom: "8px" }}>Unit Ready on Standby • Mysuru Sector</h2>
                <p style={{ fontSize: "0.925rem", maxWidth: "560px", margin: "0 auto 20px" }}>
                  Vehicle {selectedAmbulance.vehicleNumber} ({selectedAmbulance.driverName}) is registered and listening for emergency complaints across Mysuru. When a citizen raises a complaint near your sector, you can accept the response and proceed with AI navigation.
                </p>
                <div style={{ display: "inline-flex", gap: "10px" }}>
                  <span className="badge badge-resolved">GPS Active</span>
                  <span className="badge badge-info">Siren Ready</span>
                  <span className="badge badge-neutral">Oxygen Restocked</span>
                </div>
              </div>
            </div>
          )}

          {/* EDIT VEHICLE DETAILS MODAL */}
          {showVehicleModal && (
            <div className="modal-overlay" onClick={() => setShowVehicleModal(false)}>
              <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Ambulance size={20} color="#F59E0B" /> Update Vehicle & Driver Details
                  </h3>
                  <button onClick={() => setShowVehicleModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveVehicle} style={{ padding: "24px" }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration Plate (Mysuru)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.vehicleNumber}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Driver Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.driverName}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Driver Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.driverPhone}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label className="form-label">Driving License Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={vehicleForm.driverLicense}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, driverLicense: e.target.value })}
                        placeholder="KA-09-2015-00441"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Equipment Level</label>
                      <select
                        className="form-select"
                        value={vehicleForm.vehicleType}
                        onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                      >
                        <option value="ALS">ALS (Advanced Life Support - Defibrillator, O2)</option>
                        <option value="BLS">BLS (Basic Life Support - Stretcher, First Aid)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mysuru Base Area</label>
                    <input
                      type="text"
                      className="form-input"
                      value={vehicleForm.baseArea}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, baseArea: e.target.value })}
                      placeholder="e.g. Kuvempunagar, Gokulam, Bannimantap"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                    <button type="button" onClick={() => setShowVehicleModal(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Telemetry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
