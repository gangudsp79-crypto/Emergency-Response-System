import React from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

export default function HospitalLocationPicker({ location, onLocationSelect }) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const defaultCenter = { lat: 12.2958, lng: 76.6394 };

  const handleMapClick = (event) => {
    if (!event.detail?.latLng) return;
    const latitude = Number(event.detail.latLng.lat.toFixed(6));
    const longitude = Number(event.detail.latLng.lng.toFixed(6));
    onLocationSelect({ latitude, longitude });
  };

  const position = location?.latitude && location?.longitude
    ? { lat: Number(location.latitude), lng: Number(location.longitude) }
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
          Select Hospital Coordinates (Click Map)
        </span>
        {location && (
          <span style={{ fontSize: "0.75rem", color: "#38BDF8", fontFamily: "var(--font-mono)" }}>
            [{location.latitude}, {location.longitude}]
          </span>
        )}
      </div>

      <div
        style={{
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--border-color)",
          height: "240px",
          background: "#0B0F19"
        }}
      >
        <APIProvider apiKey={googleMapsApiKey}>
          <Map
            defaultCenter={position || defaultCenter}
            defaultZoom={12}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="HOSPITAL_PICKER_MAP"
            style={{ width: "100%", height: "100%" }}
            onClick={handleMapClick}
          >
            {position && (
              <AdvancedMarker position={position}>
                <div
                  style={{
                    background: "#0EA5E9",
                    color: "#FFF",
                    padding: "6px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 12px #0EA5E9",
                    border: "2px solid #FFF"
                  }}
                >
                  <MapPin size={16} />
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}