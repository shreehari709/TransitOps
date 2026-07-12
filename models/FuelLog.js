const mongoose = require("mongoose");

const fuelLogSchema = new mongoose.Schema(
{
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },

    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip"
    },

    fuelLiters: Number,

    cost: Number,

    fuelDate: Date
},
{
    timestamps: true
});

module.exports = mongoose.model(
    "FuelLog",
    fuelLogSchema
);