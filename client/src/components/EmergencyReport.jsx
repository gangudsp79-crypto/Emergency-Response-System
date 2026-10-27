import { useEffect, useState } from "react";
import axios from "axios";
import EmergencyMap from "./EmergencyMap";

function EmergencyReport() {
  const [formData, setFormData] = useState({
    type: "Accident",
    description: "",
    severity: "Medium",
    latitude: "",
    longitude: ""
  });

  const [message, setMessage] = useState("");
  const [emergencies, setEmergencies] = useState([]);

  const handleLocationSelect = (location) => {
  setFormData({
    ...formData,
    latitude: location.latitude,
    longitude: location.longitude
  });
};

  // Get all emergencies
  const fetchEmergencies = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:5000/api/emergencies",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setEmergencies(response.data);

    } catch (error) {
      console.error(
        "Failed to fetch emergencies:",
        error.response?.data || error.message
      );
    }
  };

  // Fetch emergencies when page loads
  useEffect(() => {
    fetchEmergencies();
  }, []);

  // Submit emergency
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/emergencies",
        {
          type: formData.type,
          description: formData.description,
          severity: formData.severity,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log("Emergency created:", response.data);

      setMessage("Emergency reported successfully!");

      // Clear form
      setFormData({
        type: "Accident",
        description: "",
        severity: "Medium",
        latitude: "",
        longitude: ""
      });

      // Get updated emergencies
      fetchEmergencies();

    } catch (error) {
      console.error(
        "Emergency creation failed:",
        error.response?.data || error.message
      );

      setMessage("Failed to report emergency.");
    }
  };

  return (
    <div>
      <h2>Report Emergency</h2>

      {message && <p>{message}</p>}

      <EmergencyMap
  onLocationSelect={handleLocationSelect}
/>

      <form onSubmit={handleSubmit}>

        {/* Emergency Type */}
        <label>Emergency Type</label>

        <select
          value={formData.type}
          onChange={(e) =>
            setFormData({
              ...formData,
              type: e.target.value
            })
          }
        >
          <option value="Accident">Accident</option>
          <option value="Medical">Medical</option>
          <option value="Fire">Fire</option>
          <option value="Other">Other</option>
        </select>


        {/* Description */}
        <label>Description</label>

        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value
            })
          }
          placeholder="Describe the emergency"
        />


        {/* Severity */}
        <label>Severity</label>

        <select
          value={formData.severity}
          onChange={(e) =>
            setFormData({
              ...formData,
              severity: e.target.value
            })
          }
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>


        {/* Latitude */}
        <label>Latitude</label>

        <input
          type="number"
          value={formData.latitude}
          onChange={(e) =>
            setFormData({
              ...formData,
              latitude: e.target.value
            })
          }
          placeholder="Enter latitude"
        />


        {/* Longitude */}
        <label>Longitude</label>

        <input
          type="number"
          value={formData.longitude}
          onChange={(e) =>
            setFormData({
              ...formData,
              longitude: e.target.value
            })
          }
          placeholder="Enter longitude"
        />


        <button type="submit">
          Report Emergency
        </button>

      </form>


      {/* Reported Emergencies */}
      <h2>My Emergencies</h2>

      {emergencies.length === 0 ? (
        <p>No emergencies reported yet.</p>
      ) : (
        emergencies.map((emergency) => (
          <div key={emergency._id}>

            <h3>{emergency.type}</h3>

            <p>
              <strong>Description:</strong>{" "}
              {emergency.description}
            </p>

            <p>
              <strong>Severity:</strong>{" "}
              {emergency.severity}
            </p>

            <p>
              <strong>Location:</strong>{" "}
              {emergency.latitude}, {emergency.longitude}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {emergency.status}
            </p>

            <hr />

          </div>
        ))
      )}

    </div>
  );
}

export default EmergencyReport;