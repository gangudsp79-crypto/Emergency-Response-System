import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ShieldAlert,
  Flame,
  Car,
  HeartPulse,
  UserCheck,
  AlertTriangle,
  Clock,
  Building2,
  Ambulance,
  Phone,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Send
} from "lucide-react";
import EmergencyMap from "../components/EmergencyMap";
import { useToast } from "../context/ToastContext";

const API_BASE = "http://localhost:5000/api";

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
    latitude: 12.2958,
    longitude: 76.6394
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myEmergencies, setMyEmergencies] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);

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
          longitude: Number(formData.longitude)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success("Emergency incident reported! Dispatchers notified immediately.");
      setFormData({
        type: "Accident",
        description: "",
        severity: "High",
        latitude: 12.2958,
        longitude: 76.6394
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
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "6px" }}>Citizen Emergency Portal</h1>
          <p style={{ fontSize: "0.95rem" }}>
            Report accidents, medical emergencies, or disasters. Live responders are connected 24/7.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={fetchMyEmergencies} className="btn btn-outline btn-sm" disabled={loadingList}>
            <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} /> Refresh Status
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
        {/* REPORT FORM (shown on report tab or side-by-side) */}
        {activeTab !== "history" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <ShieldAlert size={22} color="#EF4444" /> Report New Emergency
              </h2>
              <span className="badge badge-active">Priority 1</span>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Type Category Grid */}
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

              {/* Severity Selector */}
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

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Incident Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Provide critical details (e.g. 2 vehicles involved, 1 unconscious passenger, near Metro station)"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: null });
                  }}
                />
                {formErrors.description && <div className="form-error">{formErrors.description}</div>}
              </div>

              {/* Interactive Location Map Picker */}
              <div className="form-group">
                <label className="form-label">Incident Location (Click map or use GPS)</label>
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
                {isSubmitting ? "Transmitting Emergency..." : "TRANSMIT EMERGENCY ALERT"}
              </button>
            </form>
          </div>
        )}

        {/* LIVE STATUS & INCIDENTS TRACKER */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Clock size={20} color="#38BDF8" /> My Reported Incidents ({myEmergencies.length})
              </h2>
            </div>

            {myEmergencies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <CheckCircle2 size={44} color="#10B981" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>No Active Incidents</h3>
                <p style={{ fontSize: "0.875rem" }}>
                  You currently have no emergency reports filed. Use the form to report an incident anytime.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "420px", overflowY: "auto" }}>
                {myEmergencies.map((em) => {
                  const isSelected = selectedIncident?._id === em._id;
                  return (
                    <div
                      key={em._id}
                      onClick={() => setSelectedIncident(em)}
                      style={{
                        padding: "16px",
                        borderRadius: "10px",
                        background: isSelected ? "rgba(31, 41, 55, 0.8)" : "var(--bg-input)",
                        border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--border-color)"}`,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "1rem", color: "#FFFFFF" }}>{em.type}</strong>
                          <span
                            style={{
                              marginLeft: "10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: em.severity === "Critical" ? "#F87171" : "#FBBF24"
                            }}
                          >
                            [{em.severity}]
                          </span>
                        </div>
                        {getStatusBadge(em.status)}
                      </div>

                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px", lineClamp: 2 }}>
                        {em.description}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        <span>Loc: {em.latitude?.toFixed(4)}, {em.longitude?.toFixed(4)}</span>
                        <span>{new Date(em.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incident Live Tracking Details Card */}
          {selectedIncident && (
            <div className="card" style={{ border: "1px solid rgba(14, 165, 233, 0.3)" }}>
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

              {/* Status Banner */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "10px",
                  background: selectedIncident.status === "Responding"
                    ? "rgba(245, 158, 11, 0.12)"
                    : selectedIncident.status === "Resolved"
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${
                    selectedIncident.status === "Responding"
                      ? "rgba(245, 158, 11, 0.3)"
                      : selectedIncident.status === "Resolved"
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(239, 68, 68, 0.3)"
                  }`,
                  marginBottom: "20px",
                  fontSize: "0.9rem"
                }}
              >
                {selectedIncident.status === "Active" && (
                  <div>🚨 <strong>Incident Transmitted:</strong> Responders are reviewing nearby hospitals and ambulances.</div>
                )}
                {selectedIncident.status === "Responding" && (
                  <div>🚑 <strong>Units Dispatched:</strong> Hospital reserved and ambulance is en route to your coordinates.</div>
                )}
                {selectedIncident.status === "Resolved" && (
                  <div>✅ <strong>Emergency Resolved:</strong> Medical care delivered. Incident officially closed.</div>
                )}
              </div>

              {/* Assigned Resources Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                {/* Hospital Card */}
                <div style={{ padding: "14px", background: "var(--bg-input)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38BDF8", marginBottom: "8px", fontWeight: 700, fontSize: "0.85rem" }}>
                    <Building2 size={18} /> Assigned Hospital
                  </div>
                  {selectedIncident.hospitalId ? (
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.95rem" }}>{selectedIncident.hospitalId.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {selectedIncident.hospitalId.address?.city}, {selectedIncident.hospitalId.address?.state}
                      </div>
                      {selectedIncident.hospitalId.phone && (
                        <div style={{ fontSize: "0.8rem", color: "#34D399", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={12} /> {selectedIncident.hospitalId.phone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>Pending assignment...</div>
                  )}
                </div>

                {/* Ambulance Card */}
                <div style={{ padding: "14px", background: "var(--bg-input)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#F59E0B", marginBottom: "8px", fontWeight: 700, fontSize: "0.85rem" }}>
                    <Ambulance size={18} /> Assigned Ambulance
                  </div>
                  {selectedIncident.ambulanceId ? (
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "0.95rem" }}>
                        {selectedIncident.ambulanceId.vehicleNumber}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        Driver: {selectedIncident.ambulanceId.driverName}
                      </div>
                      {selectedIncident.ambulanceId.driverPhone && (
                        <div style={{ fontSize: "0.8rem", color: "#34D399", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={12} /> {selectedIncident.ambulanceId.driverPhone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>Pending assignment...</div>
                  )}
                </div>
              </div>

              {/* Map & Live Route */}
              <EmergencyMap
                interactive={false}
                selectedLocation={{ latitude: selectedIncident.latitude, longitude: selectedIncident.longitude }}
                selectedHospital={selectedIncident.hospitalId}
                height="320px"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
