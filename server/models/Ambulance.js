const mongoose = require("mongoose");

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true
    },

    driverName: {
      type: String,
      required: true
    },

    driverPhone: {
      type: String,
      default: ""
    },

    driverLicense: {
      type: String,
      default: ""
    },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    vehicleType: {
      type: String,
      enum: ["ALS", "BLS"],
      default: "ALS"
    },

    baseArea: {
      type: String,
      default: "Mysuru"
    },

    status: {
      type: String,
      enum: [
        "Available",
        "On Duty",
        "At Hospital"
      ],
      default: "Available"
    },

    emergencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Emergency",
      default: null
    },

    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },

      coordinates: {
        type: [Number],
        default: [76.6450, 12.3020]
      }
    }
  },
  {
    timestamps: true
  }
);

ambulanceSchema.index({
  currentLocation: "2dsphere"
});

module.exports = mongoose.model(
  "Ambulance",
  ambulanceSchema
);
