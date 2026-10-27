const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    address: {
      street: {
        type: String,
        default: ""
      },

      city: {
        type: String,
        required: true
      },

      state: {
        type: String,
        required: true
      },

      pincode: {
        type: String,
        default: ""
      }
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },

      coordinates: {
        type: [Number],
        required: true
      }
    },

    phone: {
      type: String,
      default: ""
    },

    facilities: {
      type: [String],
      default: []
    },

    totalBeds: {
      type: Number,
      default: 0
    },

    availableBeds: {
      type: Number,
      default: 0
    },

    totalIcuBeds: {
      type: Number,
      default: 0
    },

    availableIcuBeds: {
      type: Number,
      default: 0
    },

    totalAmbulances: {
      type: Number,
      default: 0
    },

    availableAmbulances: {
      type: Number,
      default: 0
    },

    emergencyAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Allows MongoDB to perform nearby-location searches
hospitalSchema.index({
  location: "2dsphere"
});

module.exports = mongoose.model(
  "Hospital",
  hospitalSchema
);