const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
{
    source: {
        type: String,
        required: true
    },

    destination: {
        type: String,
        required: true
    },

    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },

    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        required: true
    },

    cargoWeight: {
        type: Number,
        required: true
    },

    plannedDistance: Number,

    actualDistance: Number,

    startOdometer: Number,

    endOdometer: Number,

    status: {
        type: String,
        enum: [
            "DRAFT",
            "DISPATCHED",
            "COMPLETED",
            "CANCELLED"
        ],
        default: "DRAFT"
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("Trip", tripSchema);