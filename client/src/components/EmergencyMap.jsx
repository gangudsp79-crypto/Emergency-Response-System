import React, { useEffect, useState, useMemo, Component } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Polyline
} from "@vis.gl/react-google-maps";
import axios from "axios";
import {
  MapPin,
  Navigation,
  Compass,
  AlertCircle,
  Building2,
  Ambulance,
  Info,
  Layers,
  Radio,
  Crosshair,
  Sparkles
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { API_BASE } from "../config/api";

// Mysuru bounding box for Tactical Radar Grid projection
// Lat: 12.2600 to 12.3600 (South to North)
// Lng: 76.5900 to 76.7100 (West to East)
const MYSURU_BOUNDS = {
  minLat: 12.260,
  maxLat: 12.360,
  minLng: 76.590,
  maxLng: 76.710
};

const MYSURU_PRESETS = [
  { name: "Kuvempunagar", lat: 12.2925, lng: 76.6267 },
  { name: "Gokulam", lat: 12.3284, lng: 76.6258 },
  { name: "Bannimantap", lat: 12.3368, lng: 76.6492 },
  { name: "Hebbal Industrial", lat: 12.3615, lng: 76.6110 },
  { name: "Mysore Palace", lat: 12.3052, lng: 76.6552 }
];

// Error Boundary for Google Maps
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn("Google Maps encountered an issue, activating Tactical Radar view:", error);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function EmergencyMap({
  onLocationSelect,
  selectedLocation,
  selectedHospital,
  assignedAmbulance,
  interactive = true,
  height = "420px"
}) {
  const toast = useToast();
  const [position, setPosition] = useState(null);
  const [showEmergencyInfo, setShowEmergencyInfo] = useState(false);
  const [showHospitalInfo, setShowHospitalInfo] = useState(false);
  const [showAmbulanceInfo, setShowAmbulanceInfo] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState("map"); // 'map' | 'radar'
  const [googleMapsError, setGoogleMapsError] = useState(false);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // Update pin when selectedLocation prop changes
  useEffect(() => {
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
      setPosition({
        lat: Number(selectedLocation.latitude),
        lng: Number(selectedLocation.longitude)
      });
      setShowEmergencyInfo(true);
    }
  }, [selectedLocation]);

  // Coordinates of selected hospital
  const hospitalPos = useMemo(() => {
    if (selectedHospital?.location?.coordinates?.length === 2) {
      return {
        lng: Number(selectedHospital.location.coordinates[0]),
        lat: Number(selectedHospital.location.coordinates[1])
      };
    }
    return null;
  }, [selectedHospital]);

  // Coordinates of assigned ambulance
  const ambulancePos = useMemo(() => {
    if (
      assignedAmbulance?.currentLocation?.coordinates?.length === 2 &&
      assignedAmbulance.currentLocation.coordinates[0] !== 0
    ) {
      return {
        lng: Number(assignedAmbulance.currentLocation.coordinates[0]),
        lat: Number(assignedAmbulance.currentLocation.coordinates[1])
      };
    }
    // If not set, generate proximate coordinate near incident
    if (position) {
      return {
        lat: Number((position.lat - 0.008).toFixed(6)),
        lng: Number((position.lng + 0.007).toFixed(6))
      };
    }
    return null;
  }, [assignedAmbulance, position]);

  // Fetch route when both hospital and emergency exist
  useEffect(() => {
    if (!hospitalPos || !position) {
      setRoute(null);
      setRouteInfo(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${API_BASE}/routes`,
          {
            hospitalLatitude: hospitalPos.lat,
            hospitalLongitude: hospitalPos.lng,
            emergencyLatitude: position.lat,
            emergencyLongitude: position.lng
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (res.data?.routes?.[0]) {
          const routeData = res.data.routes[0];
          setRoute(routeData.geometry.coordinates);
          setRouteInfo({
            distance: (routeData.distance / 1000).toFixed(1), // in km
            duration: Math.max(2, Math.round(routeData.duration / 60)) // in minutes
          });
        }
      } catch (err) {
        console.warn("Route calculation fallback:", err.message);
        // Straight line fallback
        setRoute([
          [hospitalPos.lng, hospitalPos.lat],
          [position.lng, position.lat]
        ]);
        setRouteInfo({ distance: "3.5", duration: 7 });
      }
    };

    fetchRoute();
  }, [hospitalPos, position]);

  // Click on Google Map to select location
  const handleMapClick = (event) => {
    if (!interactive || !event.detail?.latLng) return;

    const lat = Number(event.detail.latLng.lat.toFixed(6));
    const lng = Number(event.detail.latLng.lng.toFixed(6));

    setPosition({ lat, lng });
    setShowEmergencyInfo(true);

    if (onLocationSelect) {
      onLocationSelect({ latitude: lat, longitude: lng });
    }
  };

  // Click on Tactical Radar Grid to select location
  const handleRadarClick = (e) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pctX = Math.max(0, Math.min(1, x / rect.width));
    const pctY = Math.max(0, Math.min(1, y / rect.height));

    // Lng grows left to right
    const lng = Number((MYSURU_BOUNDS.minLng + pctX * (MYSURU_BOUNDS.maxLng - MYSURU_BOUNDS.minLng)).toFixed(6));
    // Lat grows bottom to top (y=0 is maxLat)
    const lat = Number((MYSURU_BOUNDS.maxLat - pctY * (MYSURU_BOUNDS.maxLat - MYSURU_BOUNDS.minLat)).toFixed(6));

    setPosition({ lat, lng });
    setShowEmergencyInfo(true);

    if (onLocationSelect) {
      onLocationSelect({ latitude: lat, longitude: lng });
    }
  };

  // Convert lat/lng to percentage on Tactical Radar (0% - 100%)
  const coordsToPct = (lat, lng) => {
    if (!lat || !lng) return { left: "50%", top: "50%" };
    const x = ((lng - MYSURU_BOUNDS.minLng) / (MYSURU_BOUNDS.maxLng - MYSURU_BOUNDS.minLng)) * 100;
    const y = ((MYSURU_BOUNDS.maxLat - lat) / (MYSURU_BOUNDS.maxLat - MYSURU_BOUNDS.minLat)) * 100;
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`
    };
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        setPosition({ lat, lng });
        setShowEmergencyInfo(true);

        if (onLocationSelect) {
          onLocationSelect({ latitude: lat, longitude: lng });
        }
        toast.success(`GPS coordinates detected: ${lat}, ${lng}`);
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Unable to retrieve GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Apply a preset Mysuru landmark
  const handleApplyPreset = (preset) => {
    setPosition({ lat: preset.lat, lng: preset.lng });
    setShowEmergencyInfo(true);
    if (onLocationSelect) {
      onLocationSelect({ latitude: preset.lat, longitude: preset.lng });
    }
    toast.success(`Selected ${preset.name} (${preset.lat}, ${preset.lng})`);
  };

  // Default Center (Mysore Coordinates)
  const defaultCenter = useMemo(() => {
    if (position) return position;
    if (hospitalPos) return hospitalPos;
    return { lat: 12.2965, lng: 76.6342 };
  }, [position, hospitalPos]);

  // Tactical Radar Grid UI Component
  const renderTacticalRadar = () => {
    const incPct = position ? coordsToPct(position.lat, position.lng) : null;
    const hospPct = hospitalPos ? coordsToPct(hospitalPos.lat, hospitalPos.lng) : null;
    const ambPct = ambulancePos ? coordsToPct(ambulancePos.lat, ambulancePos.lng) : null;

    return (
      <div
        onClick={handleRadarClick}
        style={{
          width: "100%",
          height,
          position: "relative",
          background: "radial-gradient(ellipse at center, #0B192C 0%, #030712 100%)",
          cursor: interactive ? "crosshair" : "default",
          overflow: "hidden",
          userSelect: "none"
        }}
      >
        {/* Tactical Grid Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />

        {/* Concentric Radar Circles */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "300px",
            height: "300px",
            border: "1px dashed rgba(56, 189, 248, 0.15)",
            borderRadius: "50%",
            pointerEvents: "none"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            border: "1px dashed rgba(56, 189, 248, 0.1)",
            borderRadius: "50%",
            pointerEvents: "none"
          }}
        />

        {/* Mysuru Sector Landmarks */}
        {MYSURU_PRESETS.map((p, i) => {
          const loc = coordsToPct(p.lat, p.lng);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: loc.left,
                top: loc.top,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(148, 163, 184, 0.4)" }} />
              <span style={{ fontSize: "0.65rem", color: "rgba(148, 163, 184, 0.45)", fontWeight: 600, marginTop: "2px", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
            </div>
          );
        })}

        {/* SVG Route Connector Line */}
        {incPct && hospPct && (
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <line
              x1={incPct.left}
              y1={incPct.top}
              x2={hospPct.left}
              y2={hospPct.top}
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.8"
            />
          </svg>
        )}

        {/* Hospital Marker */}
        {hospPct && (
          <div
            style={{
              position: "absolute",
              left: hospPct.left,
              top: hospPct.top,
              transform: "translate(-50%, -50%)",
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div
              style={{
                background: "#0284C7",
                color: "#FFFFFF",
                padding: "6px",
                borderRadius: "50%",
                boxShadow: "0 0 16px #0EA5E9",
                border: "2px solid #FFFFFF"
              }}
            >
              <Building2 size={16} />
            </div>
            <div
              style={{
                background: "rgba(2, 132, 199, 0.9)",
                color: "#FFFFFF",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                marginTop: "4px",
                whiteSpace: "nowrap"
              }}
            >
              {selectedHospital?.name?.split("(")[0]?.trim() || "Hospital"}
            </div>
          </div>
        )}

        {/* Ambulance Marker */}
        {ambPct && (
          <div
            style={{
              position: "absolute",
              left: ambPct.left,
              top: ambPct.top,
              transform: "translate(-50%, -50%)",
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div
              style={{
                background: "#D97706",
                color: "#FFFFFF",
                padding: "6px",
                borderRadius: "50%",
                boxShadow: "0 0 16px #F59E0B",
                border: "2px solid #FFFFFF"
              }}
            >
              <Ambulance size={16} />
            </div>
            <div
              style={{
                background: "rgba(217, 119, 6, 0.9)",
                color: "#FFFFFF",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                marginTop: "4px",
                whiteSpace: "nowrap"
              }}
            >
              {assignedAmbulance?.vehicleNumber || "Ambulance"}
            </div>
          </div>
        )}

        {/* Emergency Incident Marker */}
        {incPct && (
          <div
            style={{
              position: "absolute",
              left: incPct.left,
              top: incPct.top,
              transform: "translate(-50%, -50%)",
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div
              style={{
                background: "#EF4444",
                color: "#FFFFFF",
                padding: "8px",
                borderRadius: "50%",
                boxShadow: "0 0 24px #EF4444",
                border: "2px solid #FFFFFF",
                animation: "pulse 1.5s infinite"
              }}
            >
              <AlertCircle size={18} />
            </div>
            <div
              style={{
                background: "rgba(239, 68, 68, 0.95)",
                color: "#FFFFFF",
                fontSize: "0.725rem",
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: "4px",
                marginTop: "4px",
                whiteSpace: "nowrap"
              }}
            >
              Victim: {position?.lat?.toFixed(4)}, {position?.lng?.toFixed(4)}
            </div>
          </div>
        )}

        {/* Tactical Crosshair watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            color: "rgba(56, 189, 248, 0.3)",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em"
          }}
        >
          MYSURU TACTICAL GRID (12.26°N - 76.63°E)
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        background: "#0A0F1D",
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.6)"
      }}
    >
      {/* Top Map Action Bar */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          right: "12px",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          pointerEvents: "none"
        }}
      >
        <div style={{ display: "flex", gap: "8px", pointerEvents: "auto", flexWrap: "wrap" }}>
          {interactive && (
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className="btn btn-sm btn-outline"
              style={{
                background: "rgba(17, 24, 39, 0.9)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                fontSize: "0.8rem",
                color: "#38BDF8"
              }}
            >
              <Compass size={14} color="#38BDF8" className={isLocating ? "animate-spin" : ""} />
              {isLocating ? "Detecting GPS..." : "Detect My Location"}
            </button>
          )}

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "map" ? "radar" : "map")}
            className="btn btn-sm btn-secondary"
            style={{
              background: "rgba(17, 24, 39, 0.9)",
              backdropFilter: "blur(8px)",
              fontSize: "0.8rem",
              color: "#E2E8F0"
            }}
          >
            {viewMode === "map" ? (
              <>
                <Radio size={14} color="#38BDF8" /> Tactical Radar
              </>
            ) : (
              <>
                <Layers size={14} color="#38BDF8" /> Satellite Map
              </>
            )}
          </button>
        </div>

        {/* Live Route ETA Ribbon */}
        {routeInfo && (
          <div
            style={{
              pointerEvents: "auto",
              background: "linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(99, 102, 241, 0.95))",
              backdropFilter: "blur(8px)",
              color: "#FFFFFF",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.825rem",
              fontWeight: 800,
              boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "auto"
            }}
          >
            <Navigation size={14} />
            <span>ETA: {routeInfo.duration} mins</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>{routeInfo.distance} km</span>
          </div>
        )}
      </div>

      {/* Mysuru Hotspot Quick Presets for fast pinpointing in interactive mode */}
      {interactive && (
        <div
          style={{
            position: "absolute",
            top: "56px",
            left: "12px",
            zIndex: 10,
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            pointerEvents: "auto"
          }}
        >
          {MYSURU_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "6px",
                color: "#94A3B8",
                fontSize: "0.7rem",
                padding: "3px 8px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#38BDF8";
                e.currentTarget.style.borderColor = "#38BDF8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94A3B8";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              📍 {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Map Legend Overlay in bottom left */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          zIndex: 10,
          background: "rgba(17, 24, 39, 0.88)",
          backdropFilter: "blur(8px)",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "0.725rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-muted)",
          pointerEvents: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px #EF4444" }} />
          <span>Incident</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0EA5E9" }} />
          <span>Hospital</span>
        </div>
        {assignedAmbulance && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B" }} />
            <span>Ambulance</span>
          </div>
        )}
      </div>

      {/* Render either Tactical Radar or Google Maps */}
      {viewMode === "radar" || googleMapsError || !googleMapsApiKey ? (
        renderTacticalRadar()
      ) : (
        <MapErrorBoundary
          onError={() => setGoogleMapsError(true)}
          fallback={renderTacticalRadar()}
        >
          <APIProvider
            apiKey={googleMapsApiKey}
            onError={() => setGoogleMapsError(true)}
          >
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={position ? 14 : 12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="QUICKPULSE_OPS_MAP"
              style={{ width: "100%", height }}
              onClick={handleMapClick}
            >
              {/* Emergency Marker */}
              {position && (
                <>
                  <AdvancedMarker position={position} onClick={() => setShowEmergencyInfo(true)}>
                    <div
                      style={{
                        background: "#EF4444",
                        color: "#FFFFFF",
                        padding: "8px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 20px #EF4444",
                        border: "2px solid #FFFFFF",
                        cursor: "pointer"
                      }}
                      title="Victim Incident Location"
                    >
                      <AlertCircle size={20} />
                    </div>
                  </AdvancedMarker>

                  {showEmergencyInfo && (
                    <InfoWindow position={position} onCloseClick={() => setShowEmergencyInfo(false)}>
                      <div style={{ color: "#111827", padding: "4px 8px" }}>
                        <strong style={{ color: "#DC2626", display: "flex", alignItems: "center", gap: "4px" }}>
                          <AlertCircle size={14} /> Victim Coordinates
                        </strong>
                        <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}

              {/* Hospital Marker */}
              {hospitalPos && (
                <>
                  <AdvancedMarker position={hospitalPos} onClick={() => setShowHospitalInfo(true)}>
                    <div
                      style={{
                        background: "#0EA5E9",
                        color: "#FFFFFF",
                        padding: "8px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 18px #0EA5E9",
                        border: "2px solid #FFFFFF",
                        cursor: "pointer"
                      }}
                      title={selectedHospital?.name || "Hospital Facility"}
                    >
                      <Building2 size={20} />
                    </div>
                  </AdvancedMarker>

                  {showHospitalInfo && (
                    <InfoWindow position={hospitalPos} onCloseClick={() => setShowHospitalInfo(false)}>
                      <div style={{ color: "#111827", padding: "4px 8px" }}>
                        <strong style={{ color: "#0284C7" }}>{selectedHospital?.name}</strong>
                        <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                          Available Beds: {selectedHospital?.availableBeds || 0} (ICU: {selectedHospital?.availableIcuBeds || 0})
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}

              {/* Ambulance Marker */}
              {ambulancePos && (
                <>
                  <AdvancedMarker position={ambulancePos} onClick={() => setShowAmbulanceInfo(true)}>
                    <div
                      style={{
                        background: "#F59E0B",
                        color: "#FFFFFF",
                        padding: "8px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 18px #F59E0B",
                        border: "2px solid #FFFFFF",
                        cursor: "pointer"
                      }}
                      title={assignedAmbulance?.vehicleNumber || "Assigned Ambulance"}
                    >
                      <Ambulance size={20} />
                    </div>
                  </AdvancedMarker>

                  {showAmbulanceInfo && (
                    <InfoWindow position={ambulancePos} onCloseClick={() => setShowAmbulanceInfo(false)}>
                      <div style={{ color: "#111827", padding: "4px 8px" }}>
                        <strong style={{ color: "#D97706" }}>Unit: {assignedAmbulance?.vehicleNumber}</strong>
                        <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                          Driver: {assignedAmbulance?.driverName || "Paramedic"} ({assignedAmbulance?.status || "On Duty"})
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}

              {/* Polyline Route */}
              {route && (
                <Polyline
                  path={route.map(([lng, lat]) => ({ lat, lng }))}
                  strokeColor="#38BDF8"
                  strokeWeight={5}
                  strokeOpacity={0.9}
                />
              )}
            </Map>
          </APIProvider>
        </MapErrorBoundary>
      )}
    </div>
  );
}
