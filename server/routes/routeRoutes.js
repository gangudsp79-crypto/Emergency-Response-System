const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Haversine formula to compute distance in meters as fallback
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      hospitalLatitude,
      hospitalLongitude,
      emergencyLatitude,
      emergencyLongitude
    } = req.body;

    const hLat = Number(hospitalLatitude);
    const hLng = Number(hospitalLongitude);
    const eLat = Number(emergencyLatitude);
    const eLng = Number(emergencyLongitude);

    if (isNaN(hLat) || isNaN(hLng) || isNaN(eLat) || isNaN(eLng)) {
      return res.status(400).json({
        message: "Valid hospital and emergency coordinates are required"
      });
    }

    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${hLng},${hLat};${eLng},${eLat}`,
        {
          params: {
            overview: "full",
            geometries: "geojson"
          },
          timeout: 4000
        }
      );

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        return res.json(response.data);
      }
    } catch (osrmError) {
      console.warn("OSRM routing service warning, using fallback geometry:", osrmError.message);
    }

    // Graceful fallback geometry (straight line) if OSRM is offline or timed out
    const distMeters = calculateDistanceMeters(hLat, hLng, eLat, eLng);
    const estSeconds = Math.round((distMeters / 1000 / 40) * 3600); // assume 40 km/h average

    res.json({
      code: "Ok",
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [hLng, hLat],
              [eLng, eLat]
            ]
          },
          distance: distMeters,
          duration: estSeconds,
          isFallback: true
        }
      ]
    });
  } catch (error) {
    console.error("Route calculation error:", error.message);
    res.status(500).json({
      message: "Failed to calculate route"
    });
  }
});

module.exports = router;