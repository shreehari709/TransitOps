const express = require("express");
const { protect, authorize } = require("../middleware/auth.middleware");

const {
    register,
    login,
    me,
} = require("../controllers/auth.controller");

const router = express.Router();

// Register a new user
router.post("/register", register);

// Login existing user
router.post("/login", login);

router.get("/me", protect, me);

module.exports = router;