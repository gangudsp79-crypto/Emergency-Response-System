import React, { useState } from "react";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import CitizenDashboard from "./pages/CitizenDashboard";
import DispatcherDashboard from "./pages/DispatcherDashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { ShieldAlert } from "lucide-react";

function MainApp() {
  const { user, token, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("default");

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "var(--bg-dark)"
        }}
      >
        <div className="pulse-beacon" style={{ width: "24px", height: "24px" }} />
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", fontWeight: 600 }}>
          Initializing QuickPulse Emergency AI Network...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <Login />;
  }

  const defaultTab =
    role === "citizen"
      ? "report"
      : role === "hospital"
      ? "trauma"
      : role === "driver"
      ? "mission"
      : "dispatch";

  return (
    <div className="app-layout">
      {/* Universal Top Navigation */}
      <Navbar
        activeTab={activeTab === "default" ? defaultTab : activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {role === "citizen" && (
          <CitizenDashboard
            activeTab={activeTab === "default" ? "report" : activeTab}
          />
        )}

        {role === "dispatcher" && (
          <DispatcherDashboard />
        )}

        {role === "hospital" && (
          <HospitalDashboard />
        )}

        {role === "driver" && (
          <DriverDashboard />
        )}

        {role === "admin" && (
          <AdminDashboard
            activeTab={activeTab === "default" ? "dispatch" : activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          padding: "20px 32px",
          marginTop: "auto",
          background: "var(--bg-card)",
          fontSize: "0.8rem",
          color: "var(--text-dim)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldAlert size={16} color="#EF4444" />
          <span>QuickPulse Critical Incident Management • 24/7 AI-Powered Rapid Response Protocol</span>
        </div>
        <div>
          <span>Connected as </span>
          <strong style={{ color: "var(--text-main)" }}>{user.name}</strong>
          <span style={{ textTransform: "uppercase", fontWeight: 700, color: "#38BDF8" }}> ({role})</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
