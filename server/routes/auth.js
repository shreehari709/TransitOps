const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if account is currently locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return res.status(423).json({ 
        error: `Account locked due to 5 consecutive failed attempts. Try again in ${remainingMin} minute(s).` 
      });
    }

    // Check if role matches
    if (user.role !== role) {
      return res.status(400).json({ error: `Selected role does not match user account.` });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Handle login failure and locking
      let updateData = {};
      const newAttempts = user.failedLoginAttempts + 1;
      
      if (newAttempts >= 5) {
        updateData = {
          failedLoginAttempts: newAttempts,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
        };
        await User.updateOne({ _id: user._id }, updateData);
        return res.status(423).json({ 
          error: 'Account locked due to 5 consecutive failed attempts. Please try again in 15 minutes.' 
        });
      } else {
        updateData = { failedLoginAttempts: newAttempts };
        await User.updateOne({ _id: user._id }, updateData);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
    }

    // Reset login attempts on success
    await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockedUntil: null });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
