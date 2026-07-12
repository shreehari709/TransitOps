import Driver from '../models/Driver.js';
import mongoose from 'mongoose';

// Get all drivers
export const getDrivers = async (req, res) => {
  try {
    const { 
      status, 
      licenseCategory,
      search,
      page = 1,
      limit = 10 
    } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (licenseCategory) filter.licenseCategory = licenseCategory;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { licenseNumber: new RegExp(search, 'i') },
        { contactNumber: new RegExp(search, 'i') }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [drivers, total] = await Promise.all([
      Driver.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Driver.countDocuments(filter)
    ]);
    
    res.json({
      data: drivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available drivers
export const getAvailableDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({
      status: 'Available',
      licenseExpiryDate: { $gt: new Date() }
    }).select('_id name licenseNumber licenseCategory');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single driver
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create driver
export const createDriver = async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Driver license number already exists' 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update driver
export const updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    // Prevent updating status to Available if On Trip
    if (req.body.status === 'Available' && driver.status === 'On Trip') {
      return res.status(400).json({ 
        message: 'Cannot set driver to Available while on trip' 
      });
    }
    
    const updated = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete driver
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    // Prevent deletion if On Trip
    if (driver.status === 'On Trip') {
      return res.status(400).json({ 
        message: 'Cannot delete driver currently on a trip' 
      });
    }
    
    await driver.deleteOne();
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update driver safety score
export const updateSafetyScore = async (req, res) => {
  try {
    const { safetyScore } = req.body;
    
    if (safetyScore < 0 || safetyScore > 100) {
      return res.status(400).json({ 
        message: 'Safety score must be between 0 and 100' 
      });
    }
    
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { safetyScore },
      { new: true }
    );
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get driver statistics
export const getDriverStats = async (req, res) => {
  try {
    const stats = await Driver.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgSafetyScore: { $avg: '$safetyScore' },
          avgCompletionRate: { $avg: '$tripCompletionRate' }
        }
      }
    ]);
    
    const total = stats.reduce((acc, curr) => acc + curr.count, 0);
    
    res.json({
      total,
      byStatus: stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};