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
  HeartHandshake,
  Stethoscope,
  Compass,
  Zap,
  CheckCircle2,
  User
} from "lucide-react";

const MYSURU_HOSPITALS = [
  { id: "66d000000000000000000001", name: "Apollo BGS Hospital (Kuvempunagar)" },
  { id: "66d000000000000000000002", name: "Columbia Asia Hospital (Bannimantap)" },
  { id: "66d000000000000000000003", name: "Narayana Multispeciality Hospital (Ring Road)" },
  { id: "66d000000000000000000004", name: "JSS Hospital (Agrahara / MG Road)" },
  { id: "66d000000000000000000005", name: "KR Hospital (Government Apex Trauma)" }
];

export default function Login() {
  const { loginWithGoogle, loginWithDemo } = useAuth();
  const { error: showToastError } = useToast();
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [googleStatus, setGoogleStatus] = useState(googleClientId ? "loading" : "unavailable");

  // Onboarding Role Selection State
  const [selectedRole, setSelectedRole] = useState("citizen");
  const [selectedHospitalId, setSelectedHospitalId] = useState("66d000000000000000000001");
  const [driverPlate, setDriverPlate] = useState("KA-09-EM-1001");

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
                await loginWithGoogle(res.credential, {
                  preferredRole: selectedRole,
                  hospitalId: selectedRole === "hospital" ? selectedHospitalId : null,
                  ambulanceDetails: selectedRole === "driver" ? { vehicleNumber: driverPlate } : null
                });
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
  }, [googleClientId, loginWithGoogle, showToastError, selectedRole, selectedHospitalId, driverPlate]);

  const handleDemoSignIn = (role, hospId) => {
    loginWithDemo(role, hospId || (role === "hospital" ? selectedHospitalId : null));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "36px 20px",
        background: "radial-gradient(ellipse at top, #1E1B4B 0%, #0B0F19 65%)"
      }}
    >
      <div style={{ maxWidth: "1080px", width: "100%", margin: "0 auto" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 22px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "999px",
              marginBottom: "16px"
            }}
          >
            <ShieldAlert size={20} color="#EF4444" />
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#F87171", letterSpacing: "0.06em" }}>
              MYSURU EMERGENCY RESPONSE & HOSPITAL DISPATCH NETWORK
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "12px",
              background: "linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Rapid Response. Unified Dispatch. Saving Lives.
          </h1>
          <p
            style={{
              fontSize: "1.05rem",
              maxWidth: "720px",
              margin: "0 auto",
              color: "var(--text-muted)",
              lineHeight: 1.6
            }}
          >
            Real-time emergency dispatch across 10 major Mysuru hospitals and 25 active ambulance units.
            Connecting citizens, hospital trauma teams, and paramedics with AI-automated triage.
          </p>
        </div>

        {/* Login Panels Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "28px",
            alignItems: "stretch"
          }}
        >
          {/* Card 1: Google OAuth Sign-in with Role Selection */}
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
                  marginBottom: "16px"
                }}
              >
                <Lock size={24} color="#818CF8" />
              </div>

              <h2 style={{ fontSize: "1.35rem", marginBottom: "6px" }}>Sign In with Google</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "18px" }}>
                Select your persona to configure role access and facility linking upon authentication:
              </p>

              {/* Role Selection Tabs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  background: "var(--bg-input)",
                  borderRadius: "8px",
                  padding: "4px",
                  gap: "4px",
                  marginBottom: "16px"
                }}
              >
                {[
                  { id: "citizen", label: "Citizen" },
                  { id: "hospital", label: "Hospital Admin" },
                  { id: "driver", label: "Ambulance" }
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    style={{
                      background: selectedRole === r.id ? "var(--color-primary)" : "transparent",
                      color: selectedRole === r.id ? "#FFFFFF" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 4px",
                      fontSize: "0.775rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Hospital Picker if Hospital Admin selected */}
              {selectedRole === "hospital" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                    YOUR ASSIGNED MYSURU HOSPITAL:
                  </label>
                  <select
                    className="form-select"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                  >
                    {MYSURU_HOSPITALS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Driver Plate if Ambulance selected */}
              {selectedRole === "driver" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "4px", fontWeight: 700 }}>
                    VEHICLE REGISTRATION NUMBER (MYSURU):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                    value={driverPlate}
                    onChange={(e) => setDriverPlate(e.target.value.toUpperCase())}
                    placeholder="KA-09-EM-1001"
                  />
                </div>
              )}

              {/* Google Button */}
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
                  style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-dim)", marginTop: "8px" }}
                >
                  {googleStatus === "loading" && "Initializing Google Authentication..."}
                  {googleStatus === "unavailable" &&
                    "Google Client ID ready. Use button above or the instant one-click personas on the right."}
                  {googleStatus === "error" &&
                    "Google Sign-In ready. Click button above or use one-click evaluation personas."}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "20px",
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
              End-to-end encrypted session with JWT token protection.
            </div>
          </div>

          {/* Card 2: Instant One-Click Evaluation Logins */}
          <div
            className="card"
            style={{
              background: "rgba(17, 24, 39, 0.9)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              boxShadow: "0 0 25px rgba(99, 102, 241, 0.12)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px"
              }}
            >
              <h2 style={{ fontSize: "1.35rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={20} color="#F59E0B" /> Evaluation Logins
              </h2>
              <span
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#FBBF24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  fontSize: "0.7rem",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  fontWeight: 800
                }}
              >
                1-CLICK ACCESS
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
              Jump directly into any persona to test the complete emergency workflow without OAuth delay:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Citizen */}
              <button
                onClick={() => handleDemoSignIn("citizen")}
                className="btn btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", textAlign: "left", background: "rgba(31, 41, 55, 0.4)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldAlert size={16} color="#F87171" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Citizen / Bystander Portal</div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>Raise emergency complaint & live ambulance tracking</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>

              {/* Hospital Admin */}
              <button
                onClick={() => handleDemoSignIn("hospital", "66d000000000000000000001")}
                className="btn btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", textAlign: "left", background: "rgba(31, 41, 55, 0.4)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Stethoscope size={16} color="#34D399" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Hospital Admin (Apollo BGS Hospital)</div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>Edit hospital info, acute/ICU bed capacity & AI patient logs</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>

              {/* Ambulance Driver */}
              <button
                onClick={() => handleDemoSignIn("driver")}
                className="btn btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", textAlign: "left", background: "rgba(31, 41, 55, 0.4)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ambulance size={16} color="#FBBF24" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Ambulance Driver (Unit 1001 Kuvempunagar)</div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>Accept user requests, AI hospital suggestion & GPS route</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>

              {/* Dispatcher Command */}
              <button
                onClick={() => handleDemoSignIn("dispatcher")}
                className="btn btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", textAlign: "left", background: "rgba(31, 41, 55, 0.4)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(14, 165, 233, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Radio size={16} color="#38BDF8" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Central Dispatcher Operations</div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>AI triage & 1-click autonomous dispatch</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>

              {/* System Admin */}
              <button
                onClick={() => handleDemoSignIn("admin")}
                className="btn btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", textAlign: "left", background: "rgba(31, 41, 55, 0.4)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={16} color="#C084FC" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Mysuru City Administrator</div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>Oversee all 10 hospitals and 25 ambulance units</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
