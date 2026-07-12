import express from 'express';
import User from '../models/User.js';
import { protect, isSuperAdmin } from '../middleware/auth.js';

const userRoutes = express.Router();

// Get all users (SuperAdmin only)
userRoutes.get('/', protect, isSuperAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash -registrationToken')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID (SuperAdmin only)
userRoutes.get('/:id', protect, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -registrationToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user (SuperAdmin only)
userRoutes.put('/:id', protect, isSuperAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent changing SuperAdmin role
    if (user.role === 'SuperAdmin' && role && role !== 'SuperAdmin') {
      return res.status(400).json({ message: 'Cannot change SuperAdmin role' });
    }
    
    user.name = name || user.name;
    user.email = email || user.email;
    if (role) user.role = role;
    
    await user.save();
    
    res.json({
      message: 'User updated successfully',
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

// Delete user (SuperAdmin only)
userRoutes.delete('/:id', protect, isSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting SuperAdmin
    if (user.role === 'SuperAdmin') {
      return res.status(400).json({ message: 'Cannot delete SuperAdmin' });
    }
    
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default userRoutes;