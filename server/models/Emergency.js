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