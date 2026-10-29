const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true
    },

    latitude: {
      type: Number,
      required: true
    },

    longitude: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["Active", "Responding", "Resolved"],
      default: "Active"
    },

    ambulanceStatus: {
      type: String,
      enum: [
        "Pending",
        "En Route to Scene",
        "Arrived at Scene",
        "Transporting to Hospital",
        "Delivered",
        null
      ],
      default: null
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null
    },

    ambulanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      default: null
    },

    patientVitals: {
      conscious: { type: Boolean, default: true },
      bleeding: { type: Boolean, default: false },
      breathingDifficulty: { type: Boolean, default: false },
      pulse: { type: Number, default: 75 }
    },

    aiTriage: {
      type: Object,
      default: null
    },

    userCelebrationSeen: {
      type: Boolean,
      default: false
    },

    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Emergency",
  emergencySchema
);
