import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  ShieldAlert,
  Radio,
  Building2,
  Ambulance,
  LogOut,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Stethoscope,
  Compass
} from "lucide-react";

export default function Navbar({ activeTab, onSelectTab }) {
  const { user, role, logout, loginWithDemo } = useAuth();

  const handleRoleSwitch = async (newRole) => {
    if (newRole !== role) {
      await loginWithDemo(newRole);
    }
  };

  const getRoleBadgeStyle = (userRole) => {
    switch (userRole) {
      case "admin":
        return { background: "rgba(168, 85, 247, 0.15)", color: "#C084FC", border: "1px solid rgba(168, 85, 247, 0.3)" };
      case "dispatcher":
        return { background: "rgba(14, 165, 233, 0.15)", color: "#38BDF8", border: "1px solid rgba(14, 165, 233, 0.3)" };
      case "hospital":
        return { background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.3)" };
      case "driver":
        return { background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24", border: "1px solid rgba(245, 158, 11, 0.3)" };
      default:
        return { background: "rgba(239, 68, 68, 0.15)", color: "#F87171", border: "1px solid rgba(239, 68, 68, 0.3)" };
    }
  };

  return (
    <header
      style={{
        background: "rgba(17, 24, 39, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-color)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "0 24px"
      }}
    >
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          height: "72px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px"
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(239, 68, 68, 0.4)"
            }}
          >
            <ShieldAlert size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
                QuickPulse AI
              </span>
              <span className="pulse-beacon" title="Live Emergency Network Active" />
            </div>
            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", fontWeight: 500 }}>
              Hospital & Emergency Dispatch Ops
            </div>
          </div>
        </div>

        {/* Navigation Tabs based on Active Role */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {role === "citizen" && (
            <>
              <button
                className={`btn btn-sm ${activeTab === "report" ? "btn-emergency" : "btn-outline"}`}
                onClick={() => onSelectTab("report")}
              >
                <ShieldAlert size={16} /> Report SOS
              </button>
              <button
                className={`btn btn-sm ${activeTab === "history" ? "btn-primary" : "btn-outline"}`}
                onClick={() => onSelectTab("history")}
              >
                <Radio size={16} /> My Incidents
              </button>
            </>
          )}

          {role === "dispatcher" && (
            <>
              <button
                className={`btn btn-sm ${activeTab === "dispatch" ? "btn-emergency" : "btn-outline"}`}
                onClick={() => onSelectTab("dispatch")}
              >
                <Radio size={16} /> AI Incident Command
              </button>
            </>
          )}

          {role === "hospital" && (
            <>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onSelectTab("trauma")}
              >
                <Stethoscope size={16} /> Hospital Trauma Center
              </button>
            </>
          )}

          {role === "driver" && (
            <>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => onSelectTab("mission")}
                style={{ background: "#D97706", color: "#FFF" }}
              >
                <Compass size={16} /> Paramedic Navigation
              </button>
            </>
          )}

          {role === "admin" && (
            <>
              <button
                className={`btn btn-sm ${activeTab === "dispatch" ? "btn-emergency" : "btn-outline"}`}
                onClick={() => onSelectTab("dispatch")}
              >
                <Radio size={16} /> Dispatch Operations
              </button>
              <button
                className={`btn btn-sm ${activeTab === "hospitals" ? "btn-primary" : "btn-outline"}`}
                onClick={() => onSelectTab("hospitals")}
              >
                <Building2 size={16} /> Hospitals
              </button>
              <button
                className={`btn btn-sm ${activeTab === "ambulances" ? "btn-primary" : "btn-outline"}`}
                onClick={() => onSelectTab("ambulances")}
              >
                <Ambulance size={16} /> Ambulance Fleet
              </button>
            </>
          )}
        </nav>

        {/* Right Section: Role Quick-Switcher, User Profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Universal Persona Switcher for effortless evaluation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(31, 41, 55, 0.7)",
              borderRadius: "8px",
              padding: "4px",
              border: "1px solid var(--border-color)",
              gap: "2px"
            }}
            title="Fast switch persona to test all dashboards"
          >
            <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", padding: "0 4px", fontWeight: 700 }}>
              TEST ROLE:
            </span>
            {[
              { id: "citizen", label: "Citizen" },
              { id: "dispatcher", label: "Dispatcher" },
              { id: "hospital", label: "Hospital" },
              { id: "driver", label: "Paramedic" },
              { id: "admin", label: "Admin" }
            ].map((p) => {
              const isActive = role === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleRoleSwitch(p.id)}
                  style={{
                    background: isActive ? "rgba(99, 102, 241, 0.3)" : "transparent",
                    color: isActive ? "#FFFFFF" : "var(--text-muted)",
                    border: `1px solid ${isActive ? "#6366F1" : "transparent"}`,
                    borderRadius: "4px",
                    padding: "3px 7px",
                    fontSize: "0.725rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* User Badge */}
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 12px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px"
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#FFFFFF"
                }}
              >
                {user.name?.charAt(0) || "U"}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.2 }}>
                  {user.name}
                </div>
                <div style={{ marginTop: "2px" }}>
                  <span
                    style={{
                      ...getRoleBadgeStyle(user.role),
                      fontSize: "0.65rem",
                      padding: "2px 6px",
                      borderRadius: "999px",
                      fontWeight: 700,
                      textTransform: "uppercase"
                    }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={() => logout()}
            className="btn btn-danger-outline btn-sm"
            title="Log out of system"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
