import Vehicle from '../models/Vehicle.js';
import mongoose from 'mongoose';

// Get all vehicles with pagination and filtering
export const getVehicles = async (req, res) => {
  try {
    const { 
      type, 
      status, 
      registrationNumber,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (registrationNumber) {
      filter.registrationNumber = new RegExp(registrationNumber, 'i');
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Vehicle.countDocuments(filter)
    ]);
    
    res.json({
      data: vehicles,
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

// Get available vehicles
export const getAvailableVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ 
      status: 'Available' 
    }).select('_id registrationNumber nameModel type maxLoadCapacityKg');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single vehicle
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create vehicle
export const createVehicle = async (req, res) => {
  try {
    const { 
      registrationNumber, 
      nameModel, 
      type, 
      maxLoadCapacityKg, 
      odometerKm, 
      acquisitionCost, 
      status 
    } = req.body;
    
    // Check uniqueness
    const existing = await Vehicle.findOne({ 
      registrationNumber: registrationNumber.toUpperCase() 
    });
    if (existing) {
      return res.status(400).json({ 
        message: 'Vehicle registration number must be unique' 
      });
    }
    
    const vehicle = await Vehicle.create({
      registrationNumber: registrationNumber.toUpperCase(),
      nameModel,
      type,
      maxLoadCapacityKg,
      odometerKm: odometerKm || 0,
      acquisitionCost,
      status: status || 'Available'
    });
    
    res.status(201).json(vehicle);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Vehicle registration number already exists' 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    const { registrationNumber, ...updateData } = req.body;
    
    // Check uniqueness if registration number is being changed
    if (registrationNumber && 
        registrationNumber.toUpperCase() !== vehicle.registrationNumber) {
      const existing = await Vehicle.findOne({ 
        registrationNumber: registrationNumber.toUpperCase() 
      });
      if (existing) {
        return res.status(400).json({ 
          message: 'Vehicle registration number must be unique' 
        });
      }
      updateData.registrationNumber = registrationNumber.toUpperCase();
    }
    
    // Prevent changing status to Available if vehicle is On Trip or In Shop
    if (updateData.status === 'Available' && 
        (vehicle.status === 'On Trip' || vehicle.status === 'In Shop')) {
      return res.status(400).json({ 
        message: `Cannot set vehicle to Available while it is ${vehicle.status}` 
      });
    }
    
    const updated = await Vehicle.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Prevent deletion if vehicle is On Trip
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ 
        message: 'Cannot delete vehicle that is currently on a trip' 
      });
    }
    
    await vehicle.deleteOne();
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get vehicle statistics
export const getVehicleStats = async (req, res) => {
  try {
    const stats = await Vehicle.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
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

// Bulk update vehicle status
export const bulkUpdateVehicleStatus = async (req, res) => {
  try {
    const { vehicleIds, status } = req.body;
    
    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({ message: 'Vehicle IDs required' });
    }
    
    const result = await Vehicle.updateMany(
      { _id: { $in: vehicleIds } },
      { status }
    );
    
    res.json({
      message: `${result.modifiedCount} vehicles updated`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};