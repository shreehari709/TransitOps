const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

/**
 * @desc Login User
 * @route POST /api/auth/login
 * @access Public
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate Input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and Password are required."
            });
        }

        // Find User
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Account Disabled
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled."
            });
        }

        // Account Locked
        if (
            user.lockedUntil &&
            user.lockedUntil > Date.now()
        ) {
            return res.status(423).json({
                success: false,
                message:
                    "Account locked due to multiple failed login attempts."
            });
        }

        // Compare Password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            user.failedLoginAttempts += 1;

            // Lock after 5 attempts
            if (user.failedLoginAttempts >= 5) {
                user.lockedUntil =
                    new Date(Date.now() + 30 * 60 * 1000); //30 min
            }

            await user.save();

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Reset Login Attempts
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;

        await user.save();

        // Generate JWT
        generateToken(res, user);

        return res.status(200).json({
            success: true,
            message: "Login Successful.",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

/**
 * @desc Logout User
 * @route POST /api/auth/logout
 * @access Private
 */
const logoutUser = async (req, res) => {
    try {

        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0)
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }
};

/**
 * @desc Get Logged In User
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res) => {

    try {

        const user = await User.findById(req.user.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};

module.exports = {
    loginUser,
    logoutUser,
    getCurrentUser
};