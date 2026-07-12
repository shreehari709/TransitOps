const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
{
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle"
    },

    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip"
    },

    expenseType: {
        type: String,
        enum: [
            "TOLL",
            "MAINTENANCE",
            "PARKING",
            "REPAIR",
            "OTHER"
        ]
    },

    amount: Number,

    description: String,

    expenseDate: Date
},
{
    timestamps: true
});

module.exports = mongoose.model(
    "Expense",
    expenseSchema
);