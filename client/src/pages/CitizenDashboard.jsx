import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ShieldAlert,
  Flame,
  Car,
  HeartPulse,
  AlertTriangle,
  Clock,
  Building2,
  Ambulance,
  Phone,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Send,
  Compass,
  Sparkles,
  HeartHandshake,
  Activity,
  ArrowRight,
  LifeBuoy
} from "lucide-react";
import EmergencyMap from "../components/EmergencyMap";
import { useToast } from "../context/ToastContext";
import { API_BASE } from "../config/api";

const EMERGENCY_TYPES = [
  { id: "Accident", label: "Road Accident", icon: Car, color: "#F97316" },
  { id: "Medical", label: "Medical Crisis", icon: HeartPulse, color: "#EF4444" },
  { id: "Fire", label: "Fire Outbreak", icon: Flame, color: "#DC2626" },
  { id: "Crime", label: "Crime / Assault", icon: ShieldAlert, color: "#A855F7" },
  { id: "Other", label: "Other Hazard", icon: AlertTriangle, color: "#EAB308" }
];

const SEVERITY_LEVELS = [
  { id: "Low", label: "Low", desc: "Non-critical condition" },
  { id: "Medium", label: "Medium", desc: "Urgent medical attention needed" },
  { id: "High", label: "High", desc: "Severe trauma or immediate risk" },
  { id: "Critical", label: "Critical", desc: "Life-threatening condition" }
];

export default function CitizenDashboard({ activeTab = "report" }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    type: "Accident",
    description: "",
    severity: "High",
    latitude: 12.2965,
    longitude: 76.6342,
    patientVitals: {
      conscious: true,
      bleeding: false,
      breathingDifficulty: false
    }
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myEmergencies, setMyEmergencies] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [firstAidGuide, setFirstAidGuide] = useState(null);

  // Fetch citizen's emergency incidents
  const fetchMyEmergencies = useCallback(async () => {
    try {
      setLoadingList(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/emergencies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyEmergencies(res.data);
      if (res.data.length > 0 && !selectedIncident) {
        setSelectedIncident(res.data[0]);
      } else if (selectedIncident) {
        const updated = res.data.find((e) => e._id === selectedIncident._id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch incidents");
    } finally {
      setLoadingList(false);
    }
  }, [toast, selectedIncident]);

  useEffect(() => {
    fetchMyEmergencies();
  }, [fetchMyEmergencies]);

  // Fetch AI First-Aid guidance when incident selected
  useEffect(() => {
    if (!selectedIncident) return;
    const fetchGuide = async () => {
      try {
        const res = await axios.post(`${API_BASE}/ai/first-aid`, {
          emergencyType: selectedIncident.type,
          description: selectedIncident.description
        });
        setFirstAidGuide(res.data.guide);
      } catch (err) {
        console.warn("First aid guide fetch error:", err.message);
      }
    };
    fetchGuide();
  }, [selectedIncident?.type, selectedIncident?.description]);

  // Find if any resolved emergency has not had celebration acknowledged
  const celebrationIncident = myEmergencies.find(
    (em) => em.status === "Resolved" && !em.userCelebrationSeen
  );

  const handleAcknowledgeCelebration = async (incidentId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE}/emergencies/${incidentId}/celebration-seen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyEmergencies();
    } catch (e) {
      console.warn("Celebration ack failed:", e);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.type) errors.type = "Emergency type is required";
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      errors.description = "Please describe the incident in at least 5 characters";
    }
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = "Valid latitude between -90 and 90 is required";
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = "Valid longitude between -180 and 180 is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLocationSelect = (loc) => {
    setFormData((prev) => ({
      ...prev,
      latitude: loc.latitude,
      longitude: loc.longitude
    }));
    setFormErrors((prev) => ({ ...prev, latitude: null, longitude: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warning("Please resolve form validation issues before submitting");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/emergencies`,
        {
          type: formData.type,
          description: formData.description.trim(),
          severity: formData.severity,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          patientVitals: formData.patientVitals
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success("Emergency SOS transmitted! Dispatchers and AI Triage notified.");
      setFormData({
        type: "Accident",
        description: "",
        severity: "High",
        latitude: 12.2965,
        longitude: 76.6342,
        patientVitals: { conscious: true, bleeding: false, breathingDifficulty: false }
      });
      setSelectedIncident(res.data.emergency);
      fetchMyEmergencies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit emergency report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Responding":
        return <span className="badge badge-responding">Responding</span>;
      case "Resolved":
        return <span className="badge badge-resolved">Resolved</span>;
      default:
        return <span className="badge badge-active">Active</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(17, 24, 39, 0.95) 100%)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "16px",
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)"
            }}
          >
            <ShieldAlert size={28} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "1.6rem" }}>Citizen Emergency SOS & Rapid Dispatch</h1>
              <span className="pulse-beacon" title="Emergency Responders Live" />
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Transmit instant accident alerts with live GPS, nearest hospital reservation, and AI bystander first-aid.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={fetchMyEmergencies} className="btn btn-outline btn-sm" disabled={loadingList}>
            <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} /> Refresh Feed
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: activeTab === "history" ? "1fr" : "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "28px",
          alignItems: "start"
        }}
      >
        {/* REPORT FORM */}
        {activeTab !== "history" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ShieldAlert size={22} color="#EF4444" /> Transmit Emergency SOS
              </h2>
              <span className="badge badge-active">Priority 1 Triage</span>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Category */}
              <div className="form-group">
                <label className="form-label">Incident Category</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "10px"
                  }}
                >
                  {EMERGENCY_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = formData.type === t.id;
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setFormData({ ...formData, type: t.id })}
                        style={{
                          background: isSelected ? "rgba(239, 68, 68, 0.2)" : "var(--bg-input)",
                          border: `1px solid ${isSelected ? "#EF4444" : "var(--border-color)"}`,
                          borderRadius: "10px",
                          padding: "12px 10px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        <Icon size={20} color={isSelected ? "#EF4444" : t.color} />
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isSelected ? "#FFFFFF" : "var(--text-muted)" }}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Level */}
              <div className="form-group">
                <label className="form-label">Severity Level</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {SEVERITY_LEVELS.map((s) => {
                    const isSelected = formData.severity === s.id;
                    let activeBg = "rgba(99, 102, 241, 0.2)";
                    let activeBorder = "#6366F1";
                    if (s.id === "Critical") { activeBg = "rgba(239, 68, 68, 0.2)"; activeBorder = "#EF4444"; }
                    if (s.id === "High") { activeBg = "rgba(249, 115, 22, 0.2)"; activeBorder = "#F97316"; }
                    if (s.id === "Medium") { activeBg = "rgba(251, 191, 36, 0.2)"; activeBorder = "#FBBF24"; }
                    if (s.id === "Low") { activeBg = "rgba(52, 211, 153, 0.2)"; activeBorder = "#34D399"; }

                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setFormData({ ...formData, severity: s.id })}
                        style={{
                          background: isSelected ? activeBg : "var(--bg-input)",
                          border: `1px solid ${isSelected ? activeBorder : "var(--border-color)"}`,
                          borderRadius: "8px",
                          padding: "10px 4px",
                          fontSize: "0.825rem",
                          fontWeight: 700,
                          color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                          cursor: "pointer"
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Patient Condition Assessment Toggles */}
              <div
                style={{
                  background: "var(--bg-input)",
                  padding: "14px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                  border: "1px solid var(--border-color)"
                }}
              >
                <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px" }}>
                  Clinical Vitals Quick Checklist
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.825rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!formData.patientVitals.conscious}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          patientVitals: { ...formData.patientVitals, conscious: !e.target.checked }
                        })
                      }
                      style={{ accentColor: "#EF4444" }}
                    />
                    <span>Unconscious</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.825rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.patientVitals.bleeding}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          patientVitals: { ...formData.patientVitals, bleeding: e.target.checked }
                        })
                      }
                      style={{ accentColor: "#EF4444" }}
                    />
                    <span>Heavy Bleeding</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.825rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.patientVitals.breathingDifficulty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          patientVitals: { ...formData.patientVitals, breathingDifficulty: e.target.checked }
                        })
                      }
                      style={{ accentColor: "#EF4444" }}
                    />
                    <span>Choking / Gasping</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Incident Description & Casualties</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Head-on motorcycle collision, 1 unconscious rider bleeding from leg, near City Gate."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: null });
                  }}
                />
                {formErrors.description && <div className="form-error">{formErrors.description}</div>}
              </div>

              {/* Interactive Location Picker */}
              <div className="form-group">
                <label className="form-label">Victim Location (Pinpoint on map or use GPS)</label>
                <EmergencyMap
                  interactive={true}
                  selectedLocation={{ latitude: formData.latitude, longitude: formData.longitude }}
                  onLocationSelect={handleLocationSelect}
                  height="260px"
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    />
                    {formErrors.latitude && <div className="form-error">{formErrors.latitude}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    />
                    {formErrors.longitude && <div className="form-error">{formErrors.longitude}</div>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-emergency btn-lg"
                style={{ width: "100%", marginTop: "10px" }}
              >
                <Send size={18} />
                {isSubmitting ? "Transmitting to 24/7 Network..." : "TRANSMIT EMERGENCY SOS"}
              </button>
            </form>
          </div>
        )}

        {/* LIVE TRACKER & INCIDENT QUEUE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Clock size={20} color="#38BDF8" /> My Emergency History ({myEmergencies.length})
              </h2>
            </div>

            {myEmergencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <CheckCircle2 size={44} color="#10B981" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>No Active Incidents</h3>
                <p style={{ fontSize: "0.875rem" }}>
                  You currently have no emergency reports filed. Use the SOS form to transmit an incident anytime.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
                {myEmergencies.map((em) => {
                  const isSelected = selectedIncident?._id === em._id;
                  return (
                    <div
                      key={em._id}
                      onClick={() => setSelectedIncident(em)}
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
                        <div>
                          <strong style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>{em.type}</strong>
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "0.725rem",
                              fontWeight: 700,
                              color: em.severity === "Critical" ? "#F87171" : "#FBBF24"
                            }}
                          >
                            [{em.severity}]
                          </span>
                        </div>
                        {getStatusBadge(em.status)}
                      </div>

                      <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "6px", lineClamp: 1 }}>
                        {em.description}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.725rem", color: "var(--text-dim)" }}>
                        <span>Loc: {em.latitude?.toFixed(4)}, {em.longitude?.toFixed(4)}</span>
                        <span>{new Date(em.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LIVE TRACKER DETAILS CARD */}
          {selectedIncident && (
            <div className="card" style={{ border: "1px solid rgba(14, 165, 233, 0.4)" }}>
              <div className="card-header">
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                    Live Incident Tracker
                  </span>
                  <h3 style={{ fontSize: "1.2rem", marginTop: "2px" }}>
                    {selectedIncident.type} - {selectedIncident.status}
                  </h3>
                </div>
                {getStatusBadge(selectedIncident.status)}
              </div>

              {/* Multi-Stage Visual Stepper */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "6px",
                  padding: "12px",
                  background: "var(--bg-input)",
                  borderRadius: "10px",
                  marginBottom: "18px",
                  textAlign: "center"
                }}
              >
                <div style={{ opacity: 1 }}>
                  <div style={{ fontSize: "0.7rem", color: "#34D399", fontWeight: 700 }}>1. SOS SENT</div>
                  <div style={{ height: "4px", background: "#10B981", borderRadius: "2px", marginTop: "4px" }} />
                </div>
                <div style={{ opacity: selectedIncident.status !== "Active" || selectedIncident.ambulanceId ? 1 : 0.4 }}>
                  <div style={{ fontSize: "0.7rem", color: selectedIncident.ambulanceId ? "#34D399" : "var(--text-dim)", fontWeight: 700 }}>
                    2. DISPATCHED
                  </div>
                  <div style={{ height: "4px", background: selectedIncident.ambulanceId ? "#10B981" : "var(--border-color)", borderRadius: "2px", marginTop: "4px" }} />
                </div>
                <div style={{ opacity: selectedIncident.ambulanceStatus === "Transporting" || selectedIncident.status === "Resolved" ? 1 : 0.4 }}>
                  <div style={{ fontSize: "0.7rem", color: selectedIncident.ambulanceStatus === "Transporting" ? "#FBBF24" : "var(--text-dim)", fontWeight: 700 }}>
                    3. EN ROUTE ER
                  </div>
                  <div style={{ height: "4px", background: selectedIncident.ambulanceStatus === "Transporting" ? "#F59E0B" : "var(--border-color)", borderRadius: "2px", marginTop: "4px" }} />
                </div>
                <div style={{ opacity: selectedIncident.status === "Resolved" ? 1 : 0.4 }}>
                  <div style={{ fontSize: "0.7rem", color: selectedIncident.status === "Resolved" ? "#34D399" : "var(--text-dim)", fontWeight: 700 }}>
                    4. DELIVERED
                  </div>
                  <div style={{ height: "4px", background: selectedIncident.status === "Resolved" ? "#10B981" : "var(--border-color)", borderRadius: "2px", marginTop: "4px" }} />
                </div>
              </div>

              {/* Assigned Resources Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
                {/* Hospital */}
                <div style={{ padding: "12px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38BDF8", marginBottom: "6px", fontWeight: 700, fontSize: "0.825rem" }}>
                    <Building2 size={16} /> Destination Hospital
                  </div>
                  {selectedIncident.hospitalId ? (
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.9rem" }}>{selectedIncident.hospitalId.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {selectedIncident.hospitalId.address?.city} • Beds Ready: {selectedIncident.hospitalId.availableBeds}
                      </div>
                      {selectedIncident.hospitalId.phone && (
                        <a
                          href={`tel:${selectedIncident.hospitalId.phone}`}
                          style={{ fontSize: "0.75rem", color: "#34D399", marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none", fontWeight: 600 }}
                        >
                          <Phone size={12} /> {selectedIncident.hospitalId.phone}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>AI matching nearest trauma bed...</div>
                  )}
                </div>

                {/* Ambulance */}
                <div style={{ padding: "12px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F59E0B", marginBottom: "6px", fontWeight: 700, fontSize: "0.825rem" }}>
                    <Ambulance size={16} /> Assigned Ambulance
                  </div>
                  {selectedIncident.ambulanceId ? (
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.9rem" }}>
                        {selectedIncident.ambulanceId.vehicleNumber}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Driver: {selectedIncident.ambulanceId.driverName}
                      </div>
                      {selectedIncident.ambulanceId.driverPhone && (
                        <a
                          href={`tel:${selectedIncident.ambulanceId.driverPhone}`}
                          style={{ fontSize: "0.75rem", color: "#34D399", marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "4px", textDecoration: "none", fontWeight: 600 }}
                        >
                          <Phone size={12} /> Call Driver
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Locating closest available unit...</div>
                  )}
                </div>
              </div>

              {/* Live Tactical Map */}
              <EmergencyMap
                interactive={false}
                selectedLocation={{ latitude: selectedIncident.latitude, longitude: selectedIncident.longitude }}
                selectedHospital={selectedIncident.hospitalId}
                assignedAmbulance={selectedIncident.ambulanceId}
                height="300px"
              />

              {/* AI Bystander First-Aid Assistant */}
              {firstAidGuide && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "10px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Sparkles size={18} color="#10B981" />
                    <h4 style={{ fontSize: "0.95rem", color: "#34D399", fontWeight: 800 }}>
                      AI Emergency Copilot: {firstAidGuide.title}
                    </h4>
                  </div>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                    While emergency responders are en route, follow these life-support protocols carefully:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.825rem" }}>
                    {firstAidGuide.steps.map((st, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <span style={{ fontWeight: 800, color: "#10B981", minWidth: "18px" }}>{i + 1}.</span>
                        <span style={{ color: "#FFFFFF" }}>{st}</span>
                      </div>
                    ))}
                  </div>

                  {firstAidGuide.warnings?.length > 0 && (
                    <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(239, 68, 68, 0.15)", borderRadius: "6px", fontSize: "0.775rem", color: "#F87171" }}>
                      <strong>Critical Precautions:</strong> {firstAidGuide.warnings.join(" ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Life-Saver Recognition Celebration Modal */}
      {celebrationIncident && (
        <div className="modal-overlay" onClick={() => handleAcknowledgeCelebration(celebrationIncident._id)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              textAlign: "center",
              padding: "36px 28px",
              background: "linear-gradient(135deg, #064E3B 0%, #0B0F19 80%)",
              border: "2px solid #10B981",
              boxShadow: "0 0 50px rgba(16, 185, 129, 0.4)"
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                boxShadow: "0 0 25px rgba(16, 185, 129, 0.6)"
              }}
            >
              <HeartPulse size={40} color="#FFFFFF" className="animate-heartbeat" />
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 14px", borderRadius: "999px", background: "rgba(16, 185, 129, 0.2)", color: "#34D399", fontWeight: 800, fontSize: "0.8rem", marginBottom: "12px" }}>
              <Sparkles size={14} /> LIFE-SAVER RECOGNITION
            </div>

            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#FFFFFF", marginBottom: "12px", lineHeight: 1.2 }}>
              You Helped Save a Life Today!
            </h2>

            <p style={{ fontSize: "1rem", color: "#E2E8F0", maxWidth: "480px", margin: "0 auto 20px", lineHeight: 1.6 }}>
              Thank you for your swift action and civic courage. The patient from incident <strong style={{ color: "#34D399" }}>#{celebrationIncident._id.slice(-6)}</strong> has been safely transported by ambulance to <strong style={{ color: "#38BDF8" }}>{celebrationIncident.hospitalId?.name || "the emergency trauma center"}</strong> and admitted into acute care.
            </p>

            <div style={{ padding: "14px", background: "rgba(17, 24, 39, 0.7)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              🚑 Ambulance <strong style={{ color: "#FFFFFF" }}>{celebrationIncident.ambulanceId?.vehicleNumber || "Unit"}</strong> has successfully completed the mission and returned to standby readiness in Mysuru.
            </div>

            <button
              onClick={() => handleAcknowledgeCelebration(celebrationIncident._id)}
              className="btn btn-success btn-lg"
              style={{ minWidth: "220px", fontWeight: 800 }}
            >
              <CheckCircle2 size={18} /> Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

