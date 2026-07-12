const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },

    licenseCategory: String,

    licenseExpiryDate: {
        type: Date,
        required: true
    },

    contactNumber: String,

    safetyScore: {
        type: Number,
        default: 100
    },

    status: {
        type: String,
        enum: [
            "AVAILABLE",
            "ON_TRIP",
            "OFF_DUTY",
            "SUSPENDED"
        ],
        default: "AVAILABLE"
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Driver", driverSchema);