import React, { useEffect, useState, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Polyline
} from "@vis.gl/react-google-maps";
import axios from "axios";
import { MapPin, Navigation, Compass, AlertCircle, Building2, Car } from "lucide-react";
import { useToast } from "../context/ToastContext";

const API_BASE = "http://localhost:5000/api";

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
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

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
            duration: Math.round(routeData.duration / 60) // in minutes
          });
        }
      } catch (err) {
        console.warn("Route calculation failed:", err.message);
        setRoute(null);
      }
    };

    fetchRoute();
  }, [hospitalPos, position]);

  // Click on map to select location
  const handleMapClick = (event) => {
    if (!interactive || !event.detail?.latLng) return;

    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;

    setPosition({ lat, lng });
    setShowEmergencyInfo(true);

    if (onLocationSelect) {
      onLocationSelect({ latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) });
    }
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
        toast.success(`Location detected: ${lat}, ${lng}`);
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Unable to retrieve GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Default Center (Mysore coordinates if not set)
  const defaultCenter = useMemo(() => {
    if (position) return position;
    if (hospitalPos) return hospitalPos;
    return { lat: 12.2958, lng: 76.6394 };
  }, [position, hospitalPos]);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        background: "#0F172A"
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
          pointerEvents: "none"
        }}
      >
        {interactive && (
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="btn btn-sm btn-outline"
            style={{
              pointerEvents: "auto",
              background: "rgba(17, 24, 39, 0.9)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
            }}
          >
            <Compass size={16} color="#38BDF8" />
            {isLocating ? "Detecting GPS..." : "Detect My Location"}
          </button>
        )}

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
              fontSize: "0.85rem",
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginLeft: "auto"
            }}
          >
            <Navigation size={16} />
            <span>ETA: {routeInfo.duration} mins</span>
            <span style={{ opacity: 0.7 }}>|</span>
            <span>{routeInfo.distance} km</span>
          </div>
        )}
      </div>

      {/* Google Map */}
      <APIProvider apiKey={googleMapsApiKey}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={position ? 14 : 12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="EMERGENCY_OPS_MAP"
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
                    boxShadow: "0 0 15px #EF4444",
                    border: "2px solid #FFFFFF"
                  }}
                >
                  <AlertCircle size={20} />
                </div>
              </AdvancedMarker>

              {showEmergencyInfo && (
                <InfoWindow position={position} onCloseClick={() => setShowEmergencyInfo(false)}>
                  <div style={{ color: "#111827", padding: "4px 8px" }}>
                    <strong style={{ color: "#DC2626", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={14} /> Emergency Incident
                    </strong>
                    <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                      Lat: {position.lat.toFixed(4)}, Lng: {position.lng.toFixed(4)}
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
                    boxShadow: "0 0 15px #0EA5E9",
                    border: "2px solid #FFFFFF"
                  }}
                >
                  <Building2 size={20} />
                </div>
              </AdvancedMarker>

              {showHospitalInfo && (
                <InfoWindow position={hospitalPos} onCloseClick={() => setShowHospitalInfo(false)}>
                  <div style={{ color: "#111827", padding: "4px 8px" }}>
                    <strong style={{ color: "#0284C7" }}>{selectedHospital.name}</strong>
                    <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                      Available Beds: {selectedHospital.availableBeds || 0}
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
    </div>
  );
}