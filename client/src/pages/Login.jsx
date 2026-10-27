import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  ShieldAlert,
  Radio,
  Building2,
  Ambulance,
  Lock,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  HeartHandshake
} from "lucide-react";

export default function Login() {
  const { loginWithGoogle, loginWithDemo } = useAuth();
  const { error: showToastError } = useToast();
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [googleStatus, setGoogleStatus] = useState(googleClientId ? "loading" : "unavailable");

  useEffect(() => {
    if (!googleClientId) {
      return undefined;
    }

    const checkGoogle = () => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        window.clearInterval(intervalId);
        window.clearTimeout(timeoutId);

        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (res) => {
              if (!res.credential) {
                showToastError("Google did not return a sign-in credential. Please try again.");
                return;
              }

              try {
                await loginWithGoogle(res.credential);
              } catch (error) {
                console.error("Google sign-in failed unexpectedly:", error);
                showToastError("Google sign-in could not be completed. Please try again.");
              }
            }
          });

          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: "320"
          });
          setGoogleStatus("ready");
        } catch (error) {
          console.error("Google sign-in initialization failed:", error);
          setGoogleStatus("error");
        }
      }
    };

    const intervalId = window.setInterval(checkGoogle, 100);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setGoogleStatus("error");
    }, 10000);
    checkGoogle();

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [googleClientId, loginWithGoogle, showToastError]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "32px 20px",
        background: "radial-gradient(ellipse at top, #1E1B4B 0%, #0B0F19 65%)"
      }}
    >
      <div style={{ maxWidth: "1000px", width: "100%", margin: "0 auto" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 20px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "999px",
              marginBottom: "20px"
            }}
          >
            <ShieldAlert size={20} color="#EF4444" />
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#F87171", letterSpacing: "0.05em" }}>
              CRITICAL EMERGENCY RESPONSE SYSTEM
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "16px",
              background: "linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Rapid Response. Unified Dispatch. Saving Lives.
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              maxWidth: "680px",
              margin: "0 auto",
              color: "var(--text-muted)",
              lineHeight: 1.6
            }}
          >
            Real-time geospatial dispatch platform connecting citizens in distress with closest medical
            centers, available ambulances, and turn-by-turn emergency navigation.
          </p>
        </div>

        {/* Login Panels Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
            alignItems: "stretch"
          }}
        >
          {/* Card 1: Official Google OAuth Login */}
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "rgba(17, 24, 39, 0.9)",
              border: "1px solid var(--border-color)"
            }}
          >
            <div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "18px"
                }}
              >
                <Lock size={24} color="#818CF8" />
              </div>
              <h2 style={{ fontSize: "1.35rem", marginBottom: "8px" }}>Sign In with Google</h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "24px" }}>
                Authenticate securely using your Google account to access role-authorized portals.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  minHeight: "44px",
                  margin: "16px 0"
                }}
              >
                <div ref={googleButtonRef}></div>
              </div>

              {googleStatus !== "ready" && (
                <div
                  aria-live="polite"
                  style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "12px" }}
                >
                  {googleStatus === "loading" && "Loading Google Authentication..."}
                  {googleStatus === "unavailable" &&
                    "Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in the client environment."}
                  {googleStatus === "error" &&
                    "Google sign-in could not initialize. Check the client ID and network, then reload."}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "24px",
                padding: "12px",
                background: "rgba(31, 41, 55, 0.5)",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "var(--text-dim)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <HeartHandshake size={16} color="#10B981" />
              End-to-end encrypted session with automated JWT protection.
            </div>
          </div>

          {/* Card 2: Quick Persona Testing / Instant Access */}
          <div
            className="card"
            style={{
              background: "rgba(17, 24, 39, 0.9)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              boxShadow: "0 0 25px rgba(239, 68, 68, 0.1)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}
            >
              <h2 style={{ fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={20} color="#F59E0B" /> Demo & Evaluation Login
              </h2>
              <span
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#FBBF24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontWeight: 700
                }}
              >
                ONE-CLICK ACCESS
              </span>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              Jump straight into any role to evaluate and test the complete emergency workflow without OAuth delays:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Citizen */}
              <button
                onClick={() => loginWithDemo("citizen")}
                className="btn btn-outline"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  textAlign: "left",
                  background: "rgba(31, 41, 55, 0.4)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(16, 185, 129, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <ShieldAlert size={18} color="#34D399" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.925rem" }}>Citizen Portal</div>
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      Report accidents & track live dispatch status
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>

              {/* Dispatcher */}
              <button
                onClick={() => loginWithDemo("dispatcher")}
                className="btn btn-outline"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  textAlign: "left",
                  background: "rgba(31, 41, 55, 0.4)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(14, 165, 233, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Radio size={18} color="#38BDF8" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.925rem" }}>Dispatcher Operations</div>
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      Assign nearest hospital, ambulance & view routes
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>

              {/* Admin */}
              <button
                onClick={() => loginWithDemo("admin")}
                className="btn btn-outline"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  textAlign: "left",
                  background: "rgba(31, 41, 55, 0.4)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(168, 85, 247, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Building2 size={18} color="#C084FC" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.925rem" }}>Administrator Hub</div>
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      Full oversight, hospital beds & ambulance fleet
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            marginTop: "40px"
          }}
        >
          <div
            style={{
              padding: "20px",
              background: "rgba(17, 24, 39, 0.5)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              textAlign: "left"
            }}
          >
            <MapPin size={24} color="#EF4444" style={{ marginBottom: "12px" }} />
            <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>Geospatial Intelligence</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Automatic 2dsphere indexing and OSRM turn-by-turn routing between emergencies and hospitals.
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              background: "rgba(17, 24, 39, 0.5)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              textAlign: "left"
            }}
          >
            <Clock size={24} color="#F59E0B" style={{ marginBottom: "12px" }} />
            <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>Sub-Minute Triage</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              One-click hospital bed reservation and instant ambulance dispatch with live driver tracking.
            </p>
          </div>

          <div
            style={{
              padding: "20px",
              background: "rgba(17, 24, 39, 0.5)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              textAlign: "left"
            }}
          >
            <Ambulance size={24} color="#10B981" style={{ marginBottom: "12px" }} />
            <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>Automatic Fleet Release</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              When an incident is marked Resolved, the assigned ambulance instantly resets to Available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}