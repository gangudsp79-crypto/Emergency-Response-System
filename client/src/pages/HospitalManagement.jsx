import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  MapPin,
  Bed,
  Ambulance,
  Activity
} from "lucide-react";
import HospitalLocationPicker from "../components/HospitalLocationPicker";
import { useToast } from "../context/ToastContext";

const API_BASE = "http://localhost:5000/api";

const initialFormState = {
  name: "",
  address: { street: "", city: "", state: "", pincode: "" },
  phone: "",
  facilities: "Emergency, ICU, Trauma, Pharmacy",
  totalBeds: 50,
  availableBeds: 25,
  totalIcuBeds: 10,
  availableIcuBeds: 4,
  totalAmbulances: 4,
  availableAmbulances: 2,
  emergencyAvailable: true
};

export default function HospitalManagement() {
  const toast = useToast();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/hospitals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHospitals(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch hospitals");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Hospital name is required";
    if (!formData.address.city.trim()) errs.city = "City is required";
    if (!formData.address.state.trim()) errs.state = "State is required";

    if (formData.phone && !/^[0-9+\-\s()]{7,15}$/.test(formData.phone.trim())) {
      errs.phone = "Enter a valid phone number (7-15 digits)";
    }

    if (Number(formData.totalBeds) < 0) errs.totalBeds = "Beds cannot be negative";
    if (Number(formData.availableBeds) > Number(formData.totalBeds)) {
      errs.availableBeds = "Available beds cannot exceed total beds";
    }

    if (!selectedLocation || !selectedLocation.latitude || !selectedLocation.longitude) {
      errs.location = "Please click on the map to pin hospital location";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAdd = () => {
    setEditingHospital(null);
    setFormData(initialFormState);
    setSelectedLocation({ latitude: 12.2958, longitude: 76.6394 });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (hosp) => {
    setEditingHospital(hosp);
    setFormData({
      name: hosp.name || "",
      address: {
        street: hosp.address?.street || "",
        city: hosp.address?.city || "",
        state: hosp.address?.state || "",
        pincode: hosp.address?.pincode || ""
      },
      phone: hosp.phone || "",
      facilities: Array.isArray(hosp.facilities) ? hosp.facilities.join(", ") : "",
      totalBeds: hosp.totalBeds ?? 0,
      availableBeds: hosp.availableBeds ?? 0,
      totalIcuBeds: hosp.totalIcuBeds ?? 0,
      availableIcuBeds: hosp.availableIcuBeds ?? 0,
      totalAmbulances: hosp.totalAmbulances ?? 0,
      availableAmbulances: hosp.availableAmbulances ?? 0,
      emergencyAvailable: hosp.emergencyAvailable ?? true
    });

    if (hosp.location?.coordinates?.length === 2) {
      setSelectedLocation({
        latitude: hosp.location.coordinates[1],
        longitude: hosp.location.coordinates[0]
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      facilities: formData.facilities
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      totalBeds: Number(formData.totalBeds),
      availableBeds: Number(formData.availableBeds),
      totalIcuBeds: Number(formData.totalIcuBeds),
      availableIcuBeds: Number(formData.availableIcuBeds),
      totalAmbulances: Number(formData.totalAmbulances),
      availableAmbulances: Number(formData.availableAmbulances),
      location: {
        type: "Point",
        coordinates: [Number(selectedLocation.longitude), Number(selectedLocation.latitude)]
      }
    };

    try {
      const token = localStorage.getItem("token");
      if (editingHospital) {
        await axios.patch(`${API_BASE}/hospitals/${editingHospital._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Hospital updated successfully");
      } else {
        await axios.post(`${API_BASE}/hospitals`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Hospital registered successfully");
      }
      setShowModal(false);
      fetchHospitals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/hospitals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Hospital removed from network");
      fetchHospitals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete hospital");
    }
  };

  const filtered = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.address?.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={22} color="#0EA5E9" /> Hospital Network Directory
          </h2>
          <p style={{ fontSize: "0.875rem" }}>Manage affiliated medical centers, acute care bed capacities, and trauma availability.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> Add Hospital
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "12px" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: "36px", fontSize: "0.85rem" }}
            placeholder="Filter by hospital name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "20px"
        }}
      >
        {filtered.map((hosp) => (
          <div key={hosp._id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", color: "#FFFFFF" }}>{hosp.name}</h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                    <MapPin size={12} /> {hosp.address?.street ? `${hosp.address.street}, ` : ""}{hosp.address?.city}, {hosp.address?.state}
                  </div>
                </div>
                {hosp.emergencyAvailable ? (
                  <span className="badge badge-resolved">Trauma Ready</span>
                ) : (
                  <span className="badge badge-neutral">Full Capacity</span>
                )}
              </div>

              {/* Stats Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  padding: "12px",
                  background: "var(--bg-input)",
                  borderRadius: "8px",
                  margin: "14px 0",
                  fontSize: "0.8rem"
                }}
              >
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Available Beds:</span>{" "}
                  <strong style={{ color: "#38BDF8" }}>{hosp.availableBeds} / {hosp.totalBeds}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>ICU Units:</span>{" "}
                  <strong style={{ color: "#FBBF24" }}>{hosp.availableIcuBeds} / {hosp.totalIcuBeds}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Ambulances:</span>{" "}
                  <strong style={{ color: "#34D399" }}>{hosp.availableAmbulances} / {hosp.totalAmbulances}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Phone:</span>{" "}
                  <strong>{hosp.phone || "N/A"}</strong>
                </div>
              </div>

              {/* Facilities tags */}
              {hosp.facilities?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                  {hosp.facilities.map((fac, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.725rem",
                        padding: "2px 8px",
                        background: "rgba(31, 41, 55, 0.6)",
                        borderRadius: "4px",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-muted)"
                      }}
                    >
                      {fac}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
              <button onClick={() => handleOpenEdit(hosp)} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={() => handleDelete(hosp._id, hosp.name)}
                className="btn btn-danger-outline btn-sm"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog for Add / Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={20} color="#0EA5E9" />
                {editingHospital ? "Edit Hospital Information" : "Register New Hospital"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Hospital Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Apollo Multi-Speciality Hospital"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {formErrors.name && <div className="form-error">{formErrors.name}</div>}
              </div>

              {/* Address Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Street</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address.street}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                  />
                  {formErrors.city && <div className="form-error">{formErrors.city}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address.state}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                  />
                  {formErrors.state && <div className="form-error">{formErrors.state}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address.pincode}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                  />
                </div>
              </div>

              {/* Phone & Facilities */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Emergency Desk Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +91 821 2456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Facilities (Comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.facilities}
                    onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  />
                </div>
              </div>

              {/* Beds & Ambulances Numbers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.775rem" }}>Total Beds</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.totalBeds}
                    onChange={(e) => setFormData({ ...formData, totalBeds: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.775rem" }}>Avail Beds</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.availableBeds}
                    onChange={(e) => setFormData({ ...formData, availableBeds: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.775rem" }}>Total ICU</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.totalIcuBeds}
                    onChange={(e) => setFormData({ ...formData, totalIcuBeds: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.775rem" }}>Avail ICU</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formData.availableIcuBeds}
                    onChange={(e) => setFormData({ ...formData, availableIcuBeds: e.target.value })}
                  />
                </div>
              </div>

              {/* Map Location Picker */}
              <div className="form-group">
                <HospitalLocationPicker
                  location={selectedLocation}
                  onLocationSelect={(loc) => setSelectedLocation(loc)}
                />
                {formErrors.location && <div className="form-error">{formErrors.location}</div>}
              </div>

              {/* Emergency Ready Toggle */}
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="emergencyAvailable"
                  checked={formData.emergencyAvailable}
                  onChange={(e) => setFormData({ ...formData, emergencyAvailable: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "#0EA5E9" }}
                />
                <label htmlFor="emergencyAvailable" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>
                  Hospital accepts emergency trauma patients
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingHospital ? "Save Changes" : "Register Hospital"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}