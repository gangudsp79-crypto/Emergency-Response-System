import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Radio,
  Building2,
  Ambulance,
  Phone,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Sparkles,
  Zap,
  Activity,
  Bed,
  CheckCheck
} from "lucide-react";
import EmergencyMap from "../components/EmergencyMap";
import { useToast } from "../context/ToastContext";
import { API_BASE } from "../config/api";

export default function DispatcherDashboard() {
  const toast = useToast();
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [hospitalRecs, setHospitalRecs] = useState([]);
  const [ambulanceRecs, setAmbulanceRecs] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigningHospitalId, setAssigningHospitalId] = useState(null);
  const [assigningAmbulanceId, setAssigningAmbulanceId] = useState(null);
  const [autoDispatching, setAutoDispatching] = useState(false);

  // 1. Fetch all emergencies
  const fetchAllEmergencies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/emergencies/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencies(res.data);

      if (selectedEmergency) {
        const updated = res.data.find((e) => e._id === selectedEmergency._id);
        if (updated) setSelectedEmergency(updated);
      } else if (res.data.length > 0) {
        setSelectedEmergency(res.data[0]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load emergencies");
    } finally {
      setLoading(false);
    }
  }, [toast, selectedEmergency]);

  // 2. Fetch AI Recommendations for Hospital & Ambulance
  const fetchAIRecommendations = useCallback(async (emergencyId) => {
    if (!emergencyId) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [hospRes, ambRes] = await Promise.all([
        axios.get(`${API_BASE}/ai/recommend-hospital/${emergencyId}`, { headers }),
        axios.get(`${API_BASE}/ai/recommend-ambulance/${emergencyId}`, { headers })
      ]);

      setHospitalRecs(hospRes.data.recommendations || []);
      setAmbulanceRecs(ambRes.data.recommendations || []);
    } catch (err) {
      console.warn("AI recommendations fetch error:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchAllEmergencies();
  }, [fetchAllEmergencies]);

  useEffect(() => {
    if (selectedEmergency) {
      fetchAIRecommendations(selectedEmergency._id);
    }
  }, [selectedEmergency?._id, fetchAIRecommendations]);

  // 3. One-Click AI Autonomous Dispatch Action
  const handleAutoDispatch = async () => {
    if (!selectedEmergency) return;
    try {
      setAutoDispatching(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/ai/auto-dispatch/${selectedEmergency._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message || "AI Auto-Dispatch successful!");
      fetchAllEmergencies();
      fetchAIRecommendations(selectedEmergency._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "AI auto-dispatch failed");
    } finally {
      setAutoDispatching(false);
    }
  };

  // Assign Hospital manually
  const handleAssignHospital = async (hospital) => {
    if (!selectedEmergency) return;
    try {
      setAssigningHospitalId(hospital._id);
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/emergencies/${selectedEmergency._id}/assign-hospital`,
        { hospitalId: hospital._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedEmergency(res.data.emergency);
      toast.success(`Assigned ${hospital.name} to this incident`);
      fetchAllEmergencies();
      fetchAIRecommendations(selectedEmergency._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign hospital");
    } finally {
      setAssigningHospitalId(null);
    }
  };

  // Assign Ambulance manually
  const handleAssignAmbulance = async (ambulance) => {
    if (!selectedEmergency) return;
    try {
      setAssigningAmbulanceId(ambulance._id);
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/ambulances/${ambulance._id}/assign`,
        { emergencyId: selectedEmergency._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Dispatched ambulance ${ambulance.vehicleNumber}! Status set to Responding.`);
      fetchAllEmergencies();
      fetchAIRecommendations(selectedEmergency._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dispatch ambulance");
    } finally {
      setAssigningAmbulanceId(null);
    }
  };

  // Update Status
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedEmergency) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/emergencies/${selectedEmergency._id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedEmergency(res.data.emergency);
      if (newStatus === "Resolved") {
        toast.success("Incident marked Resolved. Assigned ambulance automatically freed.");
      } else {
        toast.success(`Incident status updated to ${newStatus}`);
      }
      fetchAllEmergencies();
      fetchAIRecommendations(selectedEmergency._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update incident status");
    }
  };

  // Filtered List
  const filteredEmergencies = emergencies.filter((em) => {
    const matchesStatus = statusFilter === "All" || em.status === statusFilter;
    const matchesSearch =
      em.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      em.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (em.userId?.name && em.userId.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Command Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(17, 24, 39, 0.95) 100%)",
          padding: "20px 28px",
          borderRadius: "16px",
          border: "1px solid rgba(14, 165, 233, 0.3)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(14, 165, 233, 0.4)"
            }}
          >
            <Radio size={26} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.5rem" }}>Dispatcher Incident Command Center</h1>
              <span className="pulse-beacon" />
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "2px" }}>
              AI-assisted multi-criteria triage, nearest acute trauma matching, and 1-click autonomous dispatch.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={fetchAllEmergencies} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* Main Grid: Queue (380px) + Action Console */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: "24px",
          alignItems: "start"
        }}
      >
        {/* LEFT COLUMN: Incidents Queue */}
        <div className="card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Search Bar */}
          <div style={{ position: "relative" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px", fontSize: "0.85rem" }}
              placeholder="Search category, keyword, citizen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              background: "var(--bg-input)",
              borderRadius: "8px",
              padding: "4px",
              gap: "4px"
            }}
          >
            {["All", "Active", "Responding", "Resolved"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  background: statusFilter === tab ? "var(--bg-card-hover)" : "transparent",
                  color: statusFilter === tab ? "#FFFFFF" : "var(--text-muted)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 4px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "680px", overflowY: "auto" }}>
            {filteredEmergencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-dim)" }}>
                No incidents match filter.
              </div>
            ) : (
              filteredEmergencies.map((em) => {
                const isSelected = selectedEmergency?._id === em._id;
                let badgeClass = "badge-active";
                if (em.status === "Responding") badgeClass = "badge-responding";
                if (em.status === "Resolved") badgeClass = "badge-resolved";

                return (
                  <div
                    key={em._id}
                    onClick={() => setSelectedEmergency(em)}
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      background: isSelected ? "rgba(99, 102, 241, 0.18)" : "var(--bg-input)",
                      border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--border-color)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className={`severity-dot severity-${em.severity.toLowerCase()}`} />
                        <strong style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>{em.type}</strong>
                      </div>
                      <span className={`badge ${badgeClass}`}>{em.status}</span>
                    </div>

                    <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "8px", lineClamp: 2 }}>
                      {em.description}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.725rem", color: "var(--text-dim)" }}>
                      <span>{em.userId?.name || "Bystander"}</span>
                      <span>{new Date(em.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Dispatch Console */}
        {selectedEmergency ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Incident Header & Quick Actions */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span className={`severity-dot severity-${selectedEmergency.severity.toLowerCase()}`} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase" }}>
                      INCIDENT REF: #{selectedEmergency._id.slice(-6)}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontWeight: 700,
                        background: selectedEmergency.severity === "Critical" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: selectedEmergency.severity === "Critical" ? "#F87171" : "#FBBF24"
                      }}
                    >
                      {selectedEmergency.severity} SEVERITY
                    </span>
                  </div>
                  <h2 style={{ fontSize: "1.4rem" }}>{selectedEmergency.type} Incident</h2>
                  <p style={{ fontSize: "0.925rem", marginTop: "4px" }}>{selectedEmergency.description}</p>
                </div>

                {/* Actions & 1-Click AI Auto Dispatch Button */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {selectedEmergency.status !== "Resolved" && (
                    <button
                      onClick={handleAutoDispatch}
                      disabled={autoDispatching}
                      className="btn btn-emergency btn-sm"
                      style={{
                        background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                        boxShadow: "0 0 20px rgba(99, 102, 241, 0.5)",
                        fontWeight: 800
                      }}
                      title="AI evaluates all hospitals and fleet to dispatch the best pair instantly"
                    >
                      <Zap size={16} color="#FBBF24" />
                      {autoDispatching ? "Computing AI Match..." : "⚡ AI 1-Click Auto-Dispatch"}
                    </button>
                  )}

                  {selectedEmergency.status === "Active" && (
                    <button
                      onClick={() => handleUpdateStatus("Responding")}
                      className="btn btn-warning btn-sm"
                      style={{ background: "#D97706", color: "#FFF" }}
                    >
                      Mark Responding
                    </button>
                  )}

                  {selectedEmergency.status !== "Resolved" ? (
                    <button onClick={() => handleUpdateStatus("Resolved")} className="btn btn-success btn-sm">
                      <CheckCircle2 size={16} /> Mark Resolved & Free Unit
                    </button>
                  ) : (
                    <button onClick={() => handleUpdateStatus("Active")} className="btn btn-outline btn-sm">
                      Re-open Incident
                    </button>
                  )}
                </div>
              </div>

              {/* AI Clinical Triage Insight Banner */}
              {selectedEmergency.aiTriage && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(99, 102, 241, 0.12)",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    fontSize: "0.85rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#818CF8" }}>
                      <Sparkles size={16} /> AI Triage Assessment: {selectedEmergency.aiTriage.detectedCondition}
                    </div>
                    <span style={{ fontWeight: 800, color: selectedEmergency.aiTriage.badgeColor }}>
                      {selectedEmergency.aiTriage.triageCode} (Score: {selectedEmergency.aiTriage.triageScore}/100)
                    </span>
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>{selectedEmergency.aiTriage.primaryRisk}</div>
                  {selectedEmergency.aiTriage.clinicalFlags?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                      {selectedEmergency.aiTriage.clinicalFlags.map((flag, idx) => (
                        <span key={idx} style={{ fontSize: "0.725rem", padding: "2px 8px", background: "rgba(239, 68, 68, 0.15)", color: "#F87171", borderRadius: "4px" }}>
                          ⚠ {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Coordinates Info Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                  padding: "10px 16px",
                  background: "var(--bg-input)",
                  borderRadius: "8px",
                  fontSize: "0.825rem",
                  color: "var(--text-muted)",
                  flexWrap: "wrap"
                }}
              >
                <div>
                  <strong style={{ color: "#FFFFFF" }}>Coordinates:</strong> {selectedEmergency.latitude?.toFixed(5)}, {selectedEmergency.longitude?.toFixed(5)}
                </div>
                {selectedEmergency.userId?.name && (
                  <div>
                    <strong style={{ color: "#FFFFFF" }}>Caller:</strong> {selectedEmergency.userId.name}
                  </div>
                )}
                <div>
                  <strong style={{ color: "#FFFFFF" }}>Reported:</strong> {new Date(selectedEmergency.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Tactical Live Map */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                  <Navigation size={18} color="#38BDF8" /> Tactical Route & Proximity Radar
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {selectedEmergency.hospitalId ? "Route Hospital ➔ Incident Active" : "Assign hospital to calculate route"}
                </span>
              </div>

              <EmergencyMap
                interactive={false}
                selectedLocation={{ latitude: selectedEmergency.latitude, longitude: selectedEmergency.longitude }}
                selectedHospital={selectedEmergency.hospitalId}
                assignedAmbulance={selectedEmergency.ambulanceId}
                height="340px"
              />
            </div>

            {/* Dispatcher Actions Grid: AI Recommended Hospitals (Left) + AI Ambulances (Right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* AI Ranked Hospitals Panel */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: "14px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                    <Building2 size={18} color="#0EA5E9" /> AI-Ranked Hospitals ({hospitalRecs.length})
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#818CF8", display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                    <Sparkles size={12} /> MCDA Optimization
                  </span>
                </div>

                {hospitalRecs.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", padding: "16px", textAlign: "center" }}>
                    No hospitals found within search radius.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "380px", overflowY: "auto" }}>
                    {hospitalRecs.map((rec) => {
                      const hosp = rec.hospital;
                      const isAssigned = selectedEmergency.hospitalId?._id === hosp._id;
                      return (
                        <div
                          key={hosp._id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: isAssigned ? "rgba(14, 165, 233, 0.15)" : "var(--bg-input)",
                            border: `1px solid ${isAssigned ? "#0EA5E9" : "var(--border-color)"}`
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#FFFFFF" }}>{hosp.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                {rec.distanceKm} km away • {rec.etaMinutes} min ETA • Beds: {hosp.availableBeds}/{hosp.totalBeds} • ICU: {hosp.availableIcuBeds}
                              </div>
                            </div>

                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                background: rec.matchScore >= 80 ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                color: rec.matchScore >= 80 ? "#34D399" : "#FBBF24"
                              }}
                            >
                              {rec.matchScore}% Match
                            </span>
                          </div>

                          <div style={{ fontSize: "0.775rem", color: "var(--text-dim)", marginBottom: "8px", lineHeight: 1.4 }}>
                            {rec.aiReasoning}
                          </div>

                          <button
                            onClick={() => handleAssignHospital(hosp)}
                            disabled={isAssigned || assigningHospitalId === hosp._id}
                            className={`btn btn-sm ${isAssigned ? "btn-success" : "btn-primary"}`}
                            style={{ width: "100%" }}
                          >
                            {isAssigned ? <><Check size={14} /> Assigned</> : assigningHospitalId === hosp._id ? "Assigning..." : "Assign Hospital"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI Ranked Ambulances Panel */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: "14px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                    <Ambulance size={18} color="#F59E0B" /> AI Ambulance Fleet Match ({ambulanceRecs.length})
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "#FBBF24", display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                    <Sparkles size={12} /> Proximity Scored
                  </span>
                </div>

                {/* Show currently assigned ambulance first */}
                {selectedEmergency.ambulanceId && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid #F59E0B",
                      marginBottom: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#FFFFFF" }}>
                        {selectedEmergency.ambulanceId.vehicleNumber}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Driver: {selectedEmergency.ambulanceId.driverName} • Phone: {selectedEmergency.ambulanceId.driverPhone}
                      </div>
                    </div>
                    <span className="badge badge-responding">Active Unit</span>
                  </div>
                )}

                {ambulanceRecs.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", padding: "16px", textAlign: "center" }}>
                    No ambulances found in system.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                    {ambulanceRecs.map((rec) => {
                      const amb = rec.ambulance;
                      const isAssigned = selectedEmergency.ambulanceId?._id === amb._id;
                      return (
                        <div
                          key={amb._id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "10px",
                            background: isAssigned ? "rgba(245, 158, 11, 0.15)" : "var(--bg-input)",
                            border: `1px solid ${isAssigned ? "#F59E0B" : "var(--border-color)"}`
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#FFFFFF" }}>{amb.vehicleNumber}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                Driver: {amb.driverName} • {amb.driverPhone}
                              </div>
                            </div>
                            <span className={`badge ${rec.isAvailable ? "badge-resolved" : "badge-neutral"}`}>
                              {amb.status}
                            </span>
                          </div>

                          <div style={{ fontSize: "0.775rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                            {rec.aiReasoning}
                          </div>

                          <button
                            onClick={() => handleAssignAmbulance(amb)}
                            disabled={isAssigned || assigningAmbulanceId === amb._id}
                            className={`btn btn-sm ${isAssigned ? "btn-success" : "btn-emergency"}`}
                            style={{ width: "100%" }}
                          >
                            {isAssigned ? <><Check size={14} /> Dispatched</> : assigningAmbulanceId === amb._id ? "Deploying..." : "Dispatch Ambulance"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
            <Radio size={48} color="#4B5563" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px" }}>No Emergency Selected</h3>
            <p style={{ fontSize: "0.9rem" }}>Select an active incident from the queue on the left to begin dispatch triage.</p>
          </div>
        )}
      </div>
    </div>
  );
}
