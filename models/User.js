const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: [
            "FLEET_MANAGER",
            "DRIVER",
            "SAFETY_OFFICER",
            "FINANCIAL_ANALYST"
        ],
        required: true
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);