import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Building2,
  Bed,
  Activity,
  HeartPulse,
  Ambulance,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  ShieldCheck,
  UserCheck,
  Sparkles,
  MapPin,
  Stethoscope,
  Edit,
  X,
  FileText,
  Zap,
  Check
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import EmergencyMap from "../components/EmergencyMap";
import { API_BASE } from "../config/api";

export default function HospitalDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [incomingEmergencies, setIncomingEmergencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Edit Hospital Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    street: "",
    totalBeds: 100,
    totalIcuBeds: 20,
    oxygenBeds: 15,
    facilities: ""
  });

  // AI Intake Summary Modal State
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [aiIntakeData, setAiIntakeData] = useState(null);
  const [loadingIntakeId, setLoadingIntakeId] = useState(null);

  // 1. Fetch hospitals list and match with logged in hospital admin's hospitalId
  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHospitals(res.data);

      if (res.data.length > 0) {
        // If user has a linked hospitalId, prioritize it
        let matched = null;
        if (user?.hospitalId) {
          const hId = user.hospitalId?._id || user.hospitalId;
          matched = res.data.find((h) => String(h._id) === String(hId));
        }

        if (matched) {
          setSelectedHospital(matched);
        } else if (!selectedHospital) {
          setSelectedHospital(res.data[0]);
        } else {
          const updated = res.data.find((h) => h._id === selectedHospital._id);
          if (updated) setSelectedHospital(updated);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch hospitals");
    } finally {
      setLoading(false);
    }
  }, [toast, selectedHospital, user?.hospitalId]);

  // 2. Fetch emergencies assigned to selected hospital
  const fetchHospitalEmergencies = useCallback(async () => {
    if (!selectedHospital) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/emergencies/hospital/${selectedHospital._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIncomingEmergencies(res.data);
    } catch (err) {
      console.warn("Failed to fetch hospital emergencies:", err.message);
    }
  }, [selectedHospital]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  useEffect(() => {
    if (selectedHospital) {
      fetchHospitalEmergencies();
    }
  }, [selectedHospital, fetchHospitalEmergencies]);

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!selectedHospital) return;
    setEditFormData({
      name: selectedHospital.name || "",
      phone: selectedHospital.phone || "",
      street: selectedHospital.address?.street || "",
      totalBeds: selectedHospital.totalBeds || 100,
      totalIcuBeds: selectedHospital.totalIcuBeds || 20,
      oxygenBeds: selectedHospital.oxygenBeds || 15,
      facilities: Array.isArray(selectedHospital.facilities) ? selectedHospital.facilities.join(", ") : ""
    });
    setShowEditModal(true);
  };

  // Submit Edit Hospital Info
  const handleSaveHospitalInfo = async (e) => {
    e.preventDefault();
    if (!selectedHospital) return;
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: editFormData.name,
        phone: editFormData.phone,
        address: {
          ...selectedHospital.address,
          street: editFormData.street
        },
        totalBeds: Number(editFormData.totalBeds),
        totalIcuBeds: Number(editFormData.totalIcuBeds),
        oxygenBeds: Number(editFormData.oxygenBeds),
        facilities: editFormData.facilities.split(",").map((f) => f.trim()).filter(Boolean)
      };

      const res = await axios.patch(`${API_BASE}/hospitals/${selectedHospital._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedHospital(res.data.hospital);
      toast.success("Hospital information updated successfully!");
      setShowEditModal(false);
      fetchHospitals();
    } catch (err) {
      toast.error("Failed to update hospital details");
    }
  };

  // Generate AI Intake Documentation
  const handleGenerateAIIntake = async (emergencyId) => {
    try {
      setLoadingIntakeId(emergencyId);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/ai/hospital-intake-summary/${emergencyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiIntakeData(res.data.intakeSummary);
      setShowIntakeModal(true);
    } catch (err) {
      toast.error("Failed to generate AI intake documentation");
    } finally {
      setLoadingIntakeId(null);
    }
  };

  // Quick adjust beds (+/-)
  const handleAdjustCapacity = async (field, delta) => {
    if (!selectedHospital) return;
    const currentVal = selectedHospital[field] || 0;
    const newVal = Math.max(0, currentVal + delta);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/hospitals/${selectedHospital._id}/capacity`,
        { [field]: newVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedHospital(res.data.hospital);
      toast.success(`Updated ${field === "availableBeds" ? "Acute Beds" : "ICU Beds"} to ${newVal}`);
      fetchHospitals();
    } catch (err) {
      toast.error("Failed to update bed capacity");
    }
  };

  // Toggle Trauma / Emergency Acceptance
  const handleToggleEmergencyReady = async () => {
    if (!selectedHospital) return;
    const nextState = !selectedHospital.emergencyAvailable;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/hospitals/${selectedHospital._id}/capacity`,
        { emergencyAvailable: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedHospital(res.data.hospital);
      if (nextState) {
        toast.success("Trauma Department set to ACCEPTING EMERGENCIES");
      } else {
        toast.warning("Trauma Department set to DIVERT / HIGH CAPACITY");
      }
      fetchHospitals();
    } catch (err) {
      toast.error("Failed to toggle emergency availability");
    }
  };

  // Mark patient as Admitted or Resolved
  const handlePatientAction = async (emergencyId, newStatus, bedType = "general") => {
    try {
      setActionLoadingId(emergencyId);
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_BASE}/emergencies/${emergencyId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (newStatus === "Responding" && selectedHospital) {
        if (bedType === "icu" && selectedHospital.availableIcuBeds > 0) {
          await handleAdjustCapacity("availableIcuBeds", -1);
        } else if (selectedHospital.availableBeds > 0) {
          await handleAdjustCapacity("availableBeds", -1);
        }
        toast.success("Patient admitted to trauma bay. Bed allocated.");
      } else if (newStatus === "Resolved") {
        toast.success("Patient care completed. Incident resolved & ambulance released.");
      }

      fetchHospitalEmergencies();
      fetchHospitals();
    } catch (err) {
      toast.error("Failed to update patient triage status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeCases = incomingEmergencies.filter((e) => e.status !== "Resolved");
  const resolvedCases = incomingEmergencies.filter((e) => e.status === "Resolved");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Hospital Selector & Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(17, 24, 39, 0.95) 100%)",
          border: "1px solid rgba(14, 165, 233, 0.3)",
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
              background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(14, 165, 233, 0.4)"
            }}
          >
            <Stethoscope size={28} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.6rem" }}>Hospital Administrator Command</h1>
              <span className="pulse-beacon" title="Emergency Department Connected" />
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Managing <strong>{selectedHospital?.name || "Mysuru Hospital"}</strong> • Acute bed capacity, AI patient intake & trauma admissions.
            </p>
          </div>
        </div>

        {/* Action Controls & Hospital Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={handleOpenEdit} className="btn btn-outline btn-sm" style={{ borderColor: "#0EA5E9", color: "#38BDF8" }}>
            <Edit size={14} /> Edit Hospital Info
          </button>

          <div>
            <select
              className="form-select"
              style={{ minWidth: "250px", fontSize: "0.85rem", background: "var(--bg-input)" }}
              value={selectedHospital?._id || ""}
              onChange={(e) => {
                const found = hospitals.find((h) => h._id === e.target.value);
                if (found) setSelectedHospital(found);
              }}
            >
              {hospitals.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.address?.city})
                </option>
              ))}
            </select>
          </div>

          <button onClick={fetchHospitalEmergencies} className="btn btn-outline btn-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {selectedHospital && (
        <>
          {/* Quick Real-Time Capacity Control Strip */}
          <div className="stats-grid" style={{ marginBottom: "0px" }}>
            {/* General Beds Adjuster */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0EA5E9" }}>
                <Bed size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-label">Available Acute Beds</div>
                <div className="stat-value">
                  {selectedHospital.availableBeds}{" "}
                  <span style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>/ {selectedHospital.totalBeds}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <button
                  onClick={() => handleAdjustCapacity("availableBeds", 1)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "4px 8px" }}
                  title="Add 1 Bed"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => handleAdjustCapacity("availableBeds", -1)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "4px 8px" }}
                  title="Reduce 1 Bed"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>

            {/* ICU Beds Adjuster */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>
                <Activity size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-label">Available ICU Beds</div>
                <div className="stat-value">
                  {selectedHospital.availableIcuBeds}{" "}
                  <span style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>/ {selectedHospital.totalIcuBeds}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <button
                  onClick={() => handleAdjustCapacity("availableIcuBeds", 1)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "4px 8px" }}
                  title="Add 1 ICU Bed"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => handleAdjustCapacity("availableIcuBeds", -1)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "4px 8px" }}
                  title="Reduce 1 ICU Bed"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>

            {/* Trauma Readiness Status */}
            <div className="stat-card">
              <div
                className="stat-icon"
                style={{
                  background: selectedHospital.emergencyAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: selectedHospital.emergencyAvailable ? "#10B981" : "#EF4444"
                }}
              >
                <HeartPulse size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="stat-label">Trauma Admission Status</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: selectedHospital.emergencyAvailable ? "#34D399" : "#F87171" }}>
                  {selectedHospital.emergencyAvailable ? "ACCEPTING PATIENTS" : "DIVERT TO OTHER ER"}
                </div>
              </div>
              <button
                onClick={handleToggleEmergencyReady}
                className={`btn btn-sm ${selectedHospital.emergencyAvailable ? "btn-danger-outline" : "btn-success"}`}
              >
                {selectedHospital.emergencyAvailable ? "Set Divert" : "Open Intake"}
              </button>
            </div>

            {/* Total Website Patient Intake Count */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#C084FC" }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div className="stat-label">Patients Admitted Via System</div>
                <div className="stat-value">
                  {selectedHospital.admittedPatientsCount || resolvedCases.length}
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout: Incoming Cases (Left 60%) + Facility Details / Map (Right 40%) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "start" }}>
            {/* LEFT COLUMN: Incoming Emergency Cases & Patient Intake Registry */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">
                    <Ambulance size={22} color="#EF4444" /> Incoming Patient Transports ({activeCases.length})
                  </h2>
                  <span className="badge badge-active">Live ER Feed</span>
                </div>

                {activeCases.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <CheckCircle2 size={44} color="#10B981" style={{ margin: "0 auto 12px" }} />
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>No Incoming Ambulances</h3>
                    <p style={{ fontSize: "0.875rem" }}>
                      Emergency department is on standby. Incoming trauma dispatches from Mysuru will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {activeCases.map((em) => {
                      const ai = em.aiTriage;
                      return (
                        <div
                          key={em._id}
                          style={{
                            padding: "18px",
                            background: "var(--bg-input)",
                            borderRadius: "12px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
                          }}
                        >
                          {/* Case Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className={`severity-dot severity-${em.severity.toLowerCase()}`} />
                                <strong style={{ fontSize: "1.1rem", color: "#FFFFFF" }}>{em.type}</strong>
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    background: em.severity === "Critical" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                    color: em.severity === "Critical" ? "#F87171" : "#FBBF24"
                                  }}
                                >
                                  {em.severity} SEVERITY
                                </span>
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "2px" }}>
                                Reported: {new Date(em.createdAt).toLocaleTimeString()} • Patient: {em.userId?.name || "Bystander Report"}
                              </div>
                            </div>

                            <span className="badge badge-responding">
                              {em.ambulanceStatus || "En Route to Scene"}
                            </span>
                          </div>

                          <p style={{ fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "12px" }}>
                            {em.description}
                          </p>

                          {/* AI Clinical Assessment Strip */}
                          {ai && (
                            <div
                              style={{
                                padding: "10px 14px",
                                background: "rgba(17, 24, 39, 0.8)",
                                borderRadius: "8px",
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                                marginBottom: "14px",
                                fontSize: "0.825rem"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 700, color: "#818CF8", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Sparkles size={14} /> AI Triage: {ai.detectedCondition}
                                </span>
                                <span style={{ fontWeight: 800, color: ai.badgeColor }}>
                                  {ai.triageCode} (Score: {ai.triageScore}/100)
                                </span>
                              </div>
                              <div style={{ color: "var(--text-muted)" }}>{ai.primaryRisk}</div>
                            </div>
                          )}

                          {/* Ambulance Info Strip */}
                          {em.ambulanceId && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                background: "rgba(31, 41, 55, 0.6)",
                                borderRadius: "6px",
                                fontSize: "0.825rem",
                                marginBottom: "14px"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Ambulance size={16} color="#F59E0B" />
                                <span>Unit: <strong style={{ color: "#FFFFFF" }}>{em.ambulanceId.vehicleNumber}</strong></span>
                                <span style={{ color: "var(--text-dim)" }}>|</span>
                                <span>Driver: {em.ambulanceId.driverName}</span>
                              </div>
                              {em.ambulanceId.driverPhone && (
                                <a
                                  href={`tel:${em.ambulanceId.driverPhone}`}
                                  style={{ color: "#34D399", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}
                                >
                                  <Phone size={12} /> Call Driver
                                </a>
                              )}
                            </div>
                          )}

                          {/* Action Buttons: AI Intake Paperwork + Bed Allocation */}
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <button
                              onClick={() => handleGenerateAIIntake(em._id)}
                              disabled={loadingIntakeId === em._id}
                              className="btn btn-sm btn-outline"
                              style={{ background: "rgba(99, 102, 241, 0.15)", borderColor: "#6366F1", color: "#818CF8", fontWeight: 700 }}
                            >
                              <Zap size={14} color="#FBBF24" />
                              {loadingIntakeId === em._id ? "Generating..." : "⚡ AI Auto-Intake Paperwork"}
                            </button>

                            <button
                              onClick={() => handlePatientAction(em._id, "Responding", "general")}
                              disabled={actionLoadingId === em._id}
                              className="btn btn-sm btn-primary"
                            >
                              <Bed size={14} /> Allocate Acute Bed
                            </button>
                            <button
                              onClick={() => handlePatientAction(em._id, "Responding", "icu")}
                              disabled={actionLoadingId === em._id || selectedHospital.availableIcuBeds <= 0}
                              className="btn btn-sm btn-warning"
                              style={{ background: "#D97706", color: "#FFF" }}
                            >
                              <Activity size={14} /> Allocate ICU Bay
                            </button>
                            <button
                              onClick={() => handlePatientAction(em._id, "Resolved")}
                              disabled={actionLoadingId === em._id}
                              className="btn btn-sm btn-success"
                              style={{ marginLeft: "auto" }}
                            >
                              <CheckCircle2 size={14} /> Mark Treated & Discharge
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resolved Patient Intake Registry */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                    <CheckCircle2 size={18} color="#10B981" /> Admitted Patients Log ({resolvedCases.length})
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    Maintained by QuickPulse Hospital Registry
                  </span>
                </div>

                {resolvedCases.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No discharged patient records yet today.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                    {resolvedCases.map((r) => (
                      <div
                        key={r._id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          background: "var(--bg-input)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.85rem"
                        }}
                      >
                        <div>
                          <strong>{r.type}</strong> - <span style={{ color: "var(--text-muted)" }}>{r.description.slice(0, 50)}...</span>
                          <div style={{ fontSize: "0.725rem", color: "var(--text-dim)", marginTop: "2px" }}>
                            Ref: #{r._id.slice(-6)} • Handed over by: {r.ambulanceId?.driverName || "Ambulance Unit"}
                          </div>
                        </div>
                        <span className="badge badge-resolved">Treated & Admitted</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Facility Details & Tactical Map */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="card">
                <div className="card-header" style={{ marginBottom: "12px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                    <Building2 size={18} color="#0EA5E9" /> Hospital Profile & Facilities
                  </h3>
                </div>

                <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Address:</span>{" "}
                    <strong>{selectedHospital.address?.street}, {selectedHospital.address?.city}, {selectedHospital.address?.state}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Emergency Hotline:</span>{" "}
                    <strong style={{ color: "#34D399" }}>{selectedHospital.phone || "+91 821 2568888"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Oxygen Supply:</span>{" "}
                    <strong style={{ color: "#38BDF8" }}>{selectedHospital.oxygenBeds || 20} Dedicated Oxygen Beds</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Blood Bank Status:</span>{" "}
                    <strong style={{ color: selectedHospital.bloodBankReady ? "#34D399" : "#F87171" }}>
                      {selectedHospital.bloodBankReady ? "Active / Stocked" : "Low Inventory"}
                    </strong>
                  </div>
                </div>

                {selectedHospital.facilities?.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase" }}>
                      Accredited Departments
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                      {selectedHospital.facilities.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: "0.725rem",
                            padding: "3px 8px",
                            background: "rgba(14, 165, 233, 0.15)",
                            color: "#38BDF8",
                            borderRadius: "6px",
                            border: "1px solid rgba(14, 165, 233, 0.3)"
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tactical Hospital Surroundings Map */}
              <div className="card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                    <MapPin size={18} color="#EF4444" /> Mysuru Perimeter & Route Radar
                  </h3>
                </div>
                <EmergencyMap
                  interactive={false}
                  selectedHospital={selectedHospital}
                  selectedLocation={activeCases[0] ? { latitude: activeCases[0].latitude, longitude: activeCases[0].longitude } : null}
                  height="340px"
                />
              </div>
            </div>
          </div>

          {/* EDIT HOSPITAL INFO MODAL */}
          {showEditModal && (
            <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
              <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Building2 size={20} color="#0EA5E9" /> Update Hospital Information
                  </h3>
                  <button onClick={() => setShowEditModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveHospitalInfo} style={{ padding: "24px" }}>
                  <div className="form-group">
                    <label className="form-label">Hospital Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Emergency Desk Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="+91 821 2568888"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Street Address (Mysuru)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.street}
                      onChange={(e) => setEditFormData({ ...editFormData, street: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.8rem" }}>Total Acute Beds</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editFormData.totalBeds}
                        onChange={(e) => setEditFormData({ ...editFormData, totalBeds: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.8rem" }}>Total ICU Beds</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editFormData.totalIcuBeds}
                        onChange={(e) => setEditFormData({ ...editFormData, totalIcuBeds: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "0.8rem" }}>Oxygen Beds</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editFormData.oxygenBeds}
                        onChange={(e) => setEditFormData({ ...editFormData, oxygenBeds: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Facilities / Specialties (Comma-separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.facilities}
                      onChange={(e) => setEditFormData({ ...editFormData, facilities: e.target.value })}
                      placeholder="Trauma Center, Emergency ICU, Cath Lab, CT Scanner"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                    <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* AI INTAKE DOCUMENTATION MODAL (Automating Admin Work) */}
          {showIntakeModal && aiIntakeData && (
            <div className="modal-overlay" onClick={() => setShowIntakeModal(false)}>
              <div
                className="modal-dialog"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "680px" }}
              >
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={20} color="#FBBF24" />
                    <h3 style={{ fontSize: "1.2rem", color: "#FFFFFF" }}>
                      AI Automated Patient Intake Record
                    </h3>
                  </div>
                  <button onClick={() => setShowIntakeModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: "24px", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ padding: "10px 14px", background: "rgba(99, 102, 241, 0.15)", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.3)", display: "flex", justifyContent: "space-between" }}>
                    <span>Ref: <strong>{aiIntakeData.intakeReference}</strong></span>
                    <span style={{ color: "#34D399", fontWeight: 700 }}>{aiIntakeData.adminPaperworkReductionStatus}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>Patient Name:</span>
                      <div style={{ fontWeight: 700 }}>{aiIntakeData.patientName}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>Triage Urgency:</span>
                      <div style={{ fontWeight: 800, color: "#F87171" }}>{aiIntakeData.urgencyPriority}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>Allocated Facility:</span>
                      <div>{aiIntakeData.assignedFacility}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>Allocated Bed Bay:</span>
                      <div style={{ fontWeight: 700, color: "#38BDF8" }}>{aiIntakeData.allocatedBedType}</div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "0.85rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px", fontWeight: 700 }}>
                      Automated Physician Survey & Clinical Orders:
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {aiIntakeData.automatedPhysicianChecklist.map((step, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "var(--bg-input)", borderRadius: "6px" }}>
                          <Check size={14} color="#10B981" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        toast.success("AI intake documentation archived to electronic health registry!");
                        setShowIntakeModal(false);
                      }}
                      className="btn btn-primary"
                    >
                      <CheckCircle2 size={16} /> Confirm & Save to Hospital Registry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
