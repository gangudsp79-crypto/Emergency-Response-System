import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Ambulance,
  Plus,
  Search,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Radio
} from "lucide-react";
import { useToast } from "../context/ToastContext";

import { API_BASE } from "../config/api";

const initialForm = {
  vehicleNumber: "",
  driverName: "",
  driverPhone: "",
  status: "Available"
};

export default function AmbulanceManagement() {
  const toast = useToast();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const fetchAmbulances = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/ambulances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAmbulances(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load ambulances");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAmbulances();
  }, [fetchAmbulances]);

  const validate = () => {
    const errs = {};
    if (!formData.vehicleNumber.trim()) {
      errs.vehicleNumber = "Vehicle number is required (e.g. KA-09-EA-1008)";
    }
    if (!formData.driverName.trim()) {
      errs.driverName = "Driver name is required";
    }
    if (!formData.driverPhone.trim()) {
      errs.driverPhone = "Driver contact number is required";
    } else if (!/^[0-9+\-\s()]{7,15}$/.test(formData.driverPhone.trim())) {
      errs.driverPhone = "Enter a valid phone number (7-15 digits)";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAdd = () => {
    setEditingAmbulance(null);
    setFormData(initialForm);
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (amb) => {
    setEditingAmbulance(amb);
    setFormData({
      vehicleNumber: amb.vehicleNumber,
      driverName: amb.driverName,
      driverPhone: amb.driverPhone || "",
      status: amb.status || "Available"
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const token = localStorage.getItem("token");
      if (editingAmbulance) {
        await axios.patch(`${API_BASE}/ambulances/${editingAmbulance._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Ambulance details updated");
      } else {
        await axios.post(`${API_BASE}/ambulances`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Ambulance added to fleet");
      }
      setShowModal(false);
      fetchAmbulances();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id, plate) => {
    if (!window.confirm(`Delete ambulance unit ${plate}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/ambulances/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ambulance removed from fleet");
      fetchAmbulances();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete ambulance");
    }
  };

  // Quick reset status (e.g. manual override)
  const handleQuickStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_BASE}/ambulances/${id}`,
        { status, emergencyId: status === "Available" ? null : undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Unit status changed to ${status}`);
      fetchAmbulances();
    } catch (err) {
      toast.error("Failed to update unit status");
    }
  };

  const filtered = ambulances.filter(
    (a) =>
      a.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.driverName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Ambulance size={22} color="#F59E0B" /> Emergency Ambulance Fleet
          </h2>
          <p style={{ fontSize: "0.875rem" }}>Monitor deployment readiness, assigned drivers, and emergency runs.</p>
        </div>
        <div>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> Add Ambulance Unit
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "36px", fontSize: "0.85rem" }}
            placeholder="Search by license plate or driver name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Ambulance Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px"
        }}
      >
        {filtered.map((amb) => {
          let badgeClass = "badge-resolved";
          if (amb.status === "On Duty") badgeClass = "badge-responding";
          if (amb.status === "At Hospital") badgeClass = "badge-info";

          return (
            <div key={amb._id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                      UNIT VEHICLE NUMBER
                    </span>
                    <h3 style={{ fontSize: "1.25rem", color: "#FFFFFF", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                      {amb.vehicleNumber}
                    </h3>
                  </div>
                  <span className={`badge ${badgeClass}`}>{amb.status}</span>
                </div>

                <div
                  style={{
                    padding: "12px",
                    background: "var(--bg-input)",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <User size={16} color="var(--text-muted)" />
                    <span style={{ color: "var(--text-muted)" }}>Driver:</span>
                    <strong style={{ color: "#FFFFFF" }}>{amb.driverName}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Phone size={16} color="#34D399" />
                    <span style={{ color: "var(--text-muted)" }}>Phone:</span>
                    <strong style={{ color: "#FFFFFF" }}>{amb.driverPhone || "N/A"}</strong>
                  </div>
                  {amb.emergencyId && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <Radio size={14} color="#EF4444" />
                      <span style={{ color: "#EF4444", fontSize: "0.75rem", fontWeight: 700 }}>
                        Active Run: #{String(amb.emergencyId?._id || amb.emergencyId).slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "14px", gap: "8px" }}>
                {amb.status !== "Available" && (
                  <button
                    onClick={() => handleQuickStatus(amb._id, "Available")}
                    className="btn btn-sm btn-outline"
                    title="Reset to Available"
                  >
                    Set Available
                  </button>
                )}
                <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                  <button onClick={() => handleOpenEdit(amb)} className="btn btn-outline btn-sm">
                    <Edit2 size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete(amb._id, amb.vehicleNumber)} className="btn btn-danger-outline btn-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Ambulance size={20} color="#F59E0B" />
                {editingAmbulance ? "Edit Ambulance Unit" : "Register New Ambulance"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
              <div className="form-group">
                <label className="form-label">Vehicle Registration Number *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. KA-09-EM-5501"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                />
                {formErrors.vehicleNumber && <div className="form-error">{formErrors.vehicleNumber}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Primary Driver Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rajesh Kumar"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                />
                {formErrors.driverName && <div className="form-error">{formErrors.driverName}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Driver Contact Number (10 Digits) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                />
                {formErrors.driverPhone && <div className="form-error">{formErrors.driverPhone}</div>}
              </div>

              {editingAmbulance && (
                <div className="form-group">
                  <label className="form-label">Fleet Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="On Duty">On Duty</option>
                    <option value="At Hospital">At Hospital</option>
                  </select>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAmbulance ? "Save Changes" : "Register Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}