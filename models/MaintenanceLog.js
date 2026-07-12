const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
{
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },

    maintenanceType: {
        type: String,
        required: true
    },

    description: String,

    cost: Number,

    startDate: Date,

    endDate: Date,

    status: {
        type: String,
        enum: [
            "OPEN",
            "COMPLETED"
        ],
        default: "OPEN"
    }
},
{
    timestamps: true
});

module.exports = mongoose.model(
    "MaintenanceLog",
    maintenanceSchema
);