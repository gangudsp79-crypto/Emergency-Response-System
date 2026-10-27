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
  Navigation
} from "lucide-react";
import EmergencyMap from "../components/EmergencyMap";
import { useToast } from "../context/ToastContext";

const API_BASE = "http://localhost:5000/api";

export default function DispatcherDashboard() {
  const toast = useToast();
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [availableAmbulances, setAvailableAmbulances] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigningHospitalId, setAssigningHospitalId] = useState(null);
  const [assigningAmbulanceId, setAssigningAmbulanceId] = useState(null);

  // Fetch all emergencies
  const fetchAllEmergencies = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/emergencies/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmergencies(res.data);

      // Keep selected incident updated
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

  // Fetch nearby hospitals for selected emergency
  const fetchNearbyHospitals = useCallback(async (emergencyId) => {
    if (!emergencyId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/hospitals/nearby/${emergencyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNearbyHospitals(res.data);
    } catch (err) {
      console.warn("Nearby hospitals warning:", err.message);
      setNearbyHospitals([]);
    }
  }, []);

  // Fetch available ambulances
  const fetchAvailableAmbulances = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/ambulances?status=Available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableAmbulances(res.data);
    } catch (err) {
      console.warn("Ambulances fetch error:", err.message);
      setAvailableAmbulances([]);
    }
  }, []);

  useEffect(() => {
    fetchAllEmergencies();
  }, [fetchAllEmergencies]);

  useEffect(() => {
    if (selectedEmergency) {
      fetchNearbyHospitals(selectedEmergency._id);
      fetchAvailableAmbulances();
    }
  }, [selectedEmergency?._id, fetchNearbyHospitals, fetchAvailableAmbulances]);

  // Assign Hospital
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
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign hospital");
    } finally {
      setAssigningHospitalId(null);
    }
  };

  // Assign Ambulance
  const handleAssignAmbulance = async (ambulance) => {
    if (!selectedEmergency) return;
    try {
      setAssigningAmbulanceId(ambulance._id);
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_BASE}/ambulances/${ambulance._id}/assign`,
        { emergencyId: selectedEmergency._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Dispatched ambulance ${ambulance.vehicleNumber}! Status set to Responding.`);
      fetchAllEmergencies();
      fetchAvailableAmbulances();
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
        toast.success("Incident resolved. Assigned ambulance automatically set to Available!");
      } else {
        toast.success(`Incident status updated to ${newStatus}`);
      }
      fetchAllEmergencies();
      fetchAvailableAmbulances();
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
      {/* Top Command Header & KPI strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "var(--bg-card)",
          padding: "20px 28px",
          borderRadius: "16px",
          border: "1px solid var(--border-color)"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Radio size={24} color="#38BDF8" />
            <h1 style={{ fontSize: "1.5rem" }}>Dispatcher Incident Command Center</h1>
            <span className="pulse-beacon" />
          </div>
          <p style={{ fontSize: "0.875rem", marginTop: "4px" }}>
            Triage incoming emergency alerts, assign nearest medical centers, and deploy available ambulances.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={fetchAllEmergencies} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* Main Grid: Left Triage List (400px), Right Action Console */}
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
          {/* Search & Filter Bar */}
          <div style={{ position: "relative" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: "36px", fontSize: "0.85rem" }}
              placeholder="Search type, description, citizen..."
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

          {/* Incidents List */}
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
                      background: isSelected ? "rgba(99, 102, 241, 0.15)" : "var(--bg-input)",
                      border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--border-color)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          className={`severity-dot severity-${em.severity.toLowerCase()}`}
                          title={`Severity: ${em.severity}`}
                        />
                        <strong style={{ fontSize: "0.95rem", color: "#FFFFFF" }}>{em.type}</strong>
                      </div>
                      <span className={`badge ${badgeClass}`}>{em.status}</span>
                    </div>

                    <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "8px", lineClamp: 2 }}>
                      {em.description}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.725rem", color: "var(--text-dim)" }}>
                      <span>{em.userId?.name || "Anonymous Citizen"}</span>
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
                    <span
                      className={`severity-dot severity-${selectedEmergency.severity.toLowerCase()}`}
                    />
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

                {/* Status Transition Control Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {selectedEmergency.status === "Active" && (
                    <button
                      onClick={() => handleUpdateStatus("Responding")}
                      className="btn btn-warning btn-sm"
                      style={{ background: "#D97706", color: "#FFF" }}
                    >
                      <Radio size={16} /> Mark Responding
                    </button>
                  )}

                  {selectedEmergency.status !== "Resolved" ? (
                    <button
                      onClick={() => handleUpdateStatus("Resolved")}
                      className="btn btn-success btn-sm"
                    >
                      <CheckCircle2 size={16} /> Mark Resolved & Free Ambulance
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus("Active")}
                      className="btn btn-outline btn-sm"
                    >
                      Re-open Incident
                    </button>
                  )}
                </div>
              </div>

              {/* Coordinates & Citizen Info Bar */}
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
                    <strong style={{ color: "#FFFFFF" }}>Reported By:</strong> {selectedEmergency.userId.name}
                  </div>
                )}
                <div>
                  <strong style={{ color: "#FFFFFF" }}>Reported:</strong> {new Date(selectedEmergency.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Live Interactive Map with Polyline Route */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                  <Navigation size={18} color="#38BDF8" /> Live Tactical Route
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {selectedEmergency.hospitalId ? "Route Calculated from Hospital to Incident" : "Assign hospital to calculate route"}
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

            {/* Dispatcher Actions Grid: Nearby Hospitals (Left) + Available Ambulances (Right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Nearby Hospitals Panel */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: "14px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                    <Building2 size={18} color="#38BDF8" /> Nearby Hospitals ({nearbyHospitals.length})
                  </h3>
                </div>

                {nearbyHospitals.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", padding: "16px", textAlign: "center" }}>
                    No hospitals found within search radius.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
                    {nearbyHospitals.map((hosp) => {
                      const isAssigned = selectedEmergency.hospitalId?._id === hosp._id;
                      return (
                        <div
                          key={hosp._id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "8px",
                            background: isAssigned ? "rgba(14, 165, 233, 0.15)" : "var(--bg-input)",
                            border: `1px solid ${isAssigned ? "#0EA5E9" : "var(--border-color)"}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#FFFFFF" }}>{hosp.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {hosp.address?.city} • Beds: {hosp.availableBeds}/{hosp.totalBeds} • ICU: {hosp.availableIcuBeds}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAssignHospital(hosp)}
                            disabled={isAssigned || assigningHospitalId === hosp._id}
                            className={`btn btn-sm ${isAssigned ? "btn-success" : "btn-primary"}`}
                            style={{ minWidth: "110px" }}
                          >
                            {isAssigned ? (
                              <><Check size={14} /> Assigned</>
                            ) : assigningHospitalId === hosp._id ? (
                              "Assigning..."
                            ) : (
                              "Assign"
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Available Ambulances Panel */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: "14px" }}>
                  <h3 className="card-title" style={{ fontSize: "1.05rem" }}>
                    <Ambulance size={18} color="#F59E0B" /> Available Ambulances ({availableAmbulances.length})
                  </h3>
                </div>

                {/* Show currently assigned ambulance first if any */}
                {selectedEmergency.ambulanceId && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid #F59E0B",
                      marginBottom: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#FFFFFF" }}>
                        {selectedEmergency.ambulanceId.vehicleNumber}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Driver: {selectedEmergency.ambulanceId.driverName} • Phone: {selectedEmergency.ambulanceId.driverPhone}
                      </div>
                    </div>
                    <span className="badge badge-responding">Active Unit</span>
                  </div>
                )}

                {availableAmbulances.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", padding: "16px", textAlign: "center" }}>
                    No unassigned ambulances available currently.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
                    {availableAmbulances.map((amb) => {
                      return (
                        <div
                          key={amb._id}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "8px",
                            background: "var(--bg-input)",
                            border: "1px solid var(--border-color)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#FFFFFF" }}>{amb.vehicleNumber}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              Driver: {amb.driverName} • {amb.driverPhone}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAssignAmbulance(amb)}
                            disabled={assigningAmbulanceId === amb._id}
                            className="btn btn-sm btn-emergency"
                            style={{ minWidth: "110px" }}
                          >
                            {assigningAmbulanceId === amb._id ? "Deploying..." : "Dispatch"}
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
