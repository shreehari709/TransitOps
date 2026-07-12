import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';

const authRoutes = express.Router();

// Register new user (pending approval)
authRoutes.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generate registration token
    const registrationToken = crypto.randomBytes(32).toString('hex');
    
    // Create user with pending approval
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'Dispatcher',
      isApproved: false,
      registrationToken
    });
    
    res.status(201).json({
      message: 'Registration successful. Please wait for admin approval.',
      userId: user._id,
      email: user.email,
      status: 'pending_approval'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
authRoutes.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    const user = await User.findOne({ email });
    
    // Check if account is locked
    if (user && user.lockedUntil && new Date() < user.lockedUntil) {
      return res.status(401).json({ message: 'Account locked. Please try again later.' });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({ 
        message: 'Account pending admin approval. Please wait for approval.' 
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
    
    // Check if role matches
    if (role && user.role !== role) {
      return res.status(403).json({ 
        message: `You are logged in as ${user.role}, not ${role}` 
      });
    }
    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Logout
authRoutes.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
authRoutes.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -registrationToken');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all pending users (SuperAdmin only)
authRoutes.get('/pending', protect, checkRole('SuperAdmin'), async (req, res) => {
  try {
    const pendingUsers = await User.find({ isApproved: false })
      .select('-passwordHash -registrationToken');
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users (SuperAdmin only)
authRoutes.get('/all', protect, checkRole('SuperAdmin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash -registrationToken')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve user (SuperAdmin only)
authRoutes.put('/approve/:userId', protect, checkRole('SuperAdmin'), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isApproved) {
      return res.status(400).json({ message: 'User already approved' });
    }
    
    // Update user
    user.isApproved = true;
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    if (role) {
      user.role = role;
    }
    user.registrationToken = null; // Clear registration token
    
    await user.save();
    
    res.json({
      message: 'User approved successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reject/Delete pending user (SuperAdmin only)
authRoutes.delete('/reject/:userId', protect, checkRole('SuperAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isApproved) {
      return res.status(400).json({ message: 'Cannot reject an approved user' });
    }
    
    await user.deleteOne();
    res.json({ message: 'User registration rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role (SuperAdmin only)
authRoutes.put('/role/:userId', protect, checkRole('SuperAdmin'), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.userId;
    
    if (!['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.isApproved) {
      return res.status(400).json({ message: 'Cannot change role of unapproved user' });
    }
    
    user.role = role;
    await user.save();
    
    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create initial SuperAdmin (run once)
authRoutes.post('/create-superadmin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if SuperAdmin already exists
    const existing = await User.findOne({ role: 'SuperAdmin' });
    if (existing) {
      return res.status(400).json({ message: 'SuperAdmin already exists' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const superAdmin = await User.create({
      name,
      email,
      passwordHash,
      role: 'SuperAdmin',
      isApproved: true,
      approvedAt: new Date()
    });
    
    res.status(201).json({
      message: 'SuperAdmin created successfully',
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default authRoutes;