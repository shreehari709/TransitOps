const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },

    vehicleName: String,

    status: {
        type: String,
        default: "AVAILABLE"
    }
});

module.exports = mongoose.model(
    "Vehicle",
    vehicleSchema
);