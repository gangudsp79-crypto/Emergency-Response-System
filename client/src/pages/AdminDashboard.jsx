import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ShieldAlert,
  Radio,
  Building2,
  Ambulance,
  Activity,
  Bed,
  CheckCircle2,
  Clock,
  RefreshCw,
  Layers
} from "lucide-react";
import DispatcherDashboard from "./DispatcherDashboard";
import HospitalManagement from "./HospitalManagement";
import AmbulanceManagement from "./AmbulanceManagement";
import { useToast } from "../context/ToastContext";

const API_BASE = "http://localhost:5000/api";

export default function AdminDashboard({ activeTab = "dispatch", onSelectTab }) {
  const toast = useToast();
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [stats, setStats] = useState({
    totalEmergencies: 0,
    activeEmergencies: 0,
    respondingEmergencies: 0,
    resolvedEmergencies: 0,
    totalHospitals: 0,
    totalBeds: 0,
    availableBeds: 0,
    totalAmbulances: 0,
    availableAmbulances: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [emRes, hospRes, ambRes] = await Promise.all([
        axios.get(`${API_BASE}/emergencies/all`, { headers }),
        axios.get(`${API_BASE}/hospitals`, { headers }),
        axios.get(`${API_BASE}/ambulances`, { headers })
      ]);

      const emergencies = emRes.data;
      const hospitals = hospRes.data;
      const ambulances = ambRes.data;

      setStats({
        totalEmergencies: emergencies.length,
        activeEmergencies: emergencies.filter((e) => e.status === "Active").length,
        respondingEmergencies: emergencies.filter((e) => e.status === "Responding").length,
        resolvedEmergencies: emergencies.filter((e) => e.status === "Resolved").length,
        totalHospitals: hospitals.length,
        totalBeds: hospitals.reduce((sum, h) => sum + (h.totalBeds || 0), 0),
        availableBeds: hospitals.reduce((sum, h) => sum + (h.availableBeds || 0), 0),
        totalAmbulances: ambulances.length,
        availableAmbulances: ambulances.filter((a) => a.status === "Available").length
      });
    } catch (err) {
      console.warn("Stats fetch warning:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Overview Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="stat-value">{stats.activeEmergencies}</div>
            <div className="stat-label">Active Critical Incidents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>
            <Radio size={26} />
          </div>
          <div>
            <div className="stat-value">{stats.respondingEmergencies}</div>
            <div className="stat-label">Units Responding</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(14, 165, 233, 0.15)", color: "#0EA5E9" }}>
            <Building2 size={26} />
          </div>
          <div>
            <div className="stat-value">
              {stats.availableBeds} <span style={{ fontSize: "1rem", color: "var(--text-dim)" }}>/ {stats.totalBeds}</span>
            </div>
            <div className="stat-label">Available Hospital Beds</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
            <Ambulance size={26} />
          </div>
          <div>
            <div className="stat-value">
              {stats.availableAmbulances} <span style={{ fontSize: "1rem", color: "var(--text-dim)" }}>/ {stats.totalAmbulances}</span>
            </div>
            <div className="stat-label">Available Ambulances</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "12px",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => handleTabChange("dispatch")}
            className={`btn btn-sm ${currentTab === "dispatch" ? "btn-emergency" : "btn-outline"}`}
          >
            <Radio size={16} /> Live Dispatch Operations
          </button>
          <button
            onClick={() => handleTabChange("hospitals")}
            className={`btn btn-sm ${currentTab === "hospitals" ? "btn-primary" : "btn-outline"}`}
          >
            <Building2 size={16} /> Hospitals Management
          </button>
          <button
            onClick={() => handleTabChange("ambulances")}
            className={`btn btn-sm ${currentTab === "ambulances" ? "btn-primary" : "btn-outline"}`}
          >
            <Ambulance size={16} /> Ambulance Fleet
          </button>
        </div>

        <button onClick={fetchStats} className="btn btn-outline btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh System Stats
        </button>
      </div>

      {/* Tab Content Display */}
      {currentTab === "dispatch" && <DispatcherDashboard />}
      {currentTab === "hospitals" && <HospitalManagement />}
      {currentTab === "ambulances" && <AmbulanceManagement />}
    </div>
  );
}
