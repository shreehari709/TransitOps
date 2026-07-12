import MaintenanceLog from '../models/MaintenanceLog.js';
import Vehicle from '../models/Vehicle.js';
import Expense from '../models/Expense.js';
import mongoose from 'mongoose';

// Get all maintenance logs
export const getMaintenanceLogs = async (req, res) => {
  try {
    const { 
      vehicleId, 
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10 
    } = req.query;
    
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      MaintenanceLog.find(filter)
        .populate('vehicleId', 'registrationNumber nameModel type')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ date: -1 }),
      MaintenanceLog.countDocuments(filter)
    ]);
    
    res.json({
      data: logs,
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

// Get single maintenance log
export const getMaintenanceLogById = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id)
      .populate('vehicleId', 'registrationNumber nameModel type');
    
    if (!log) {
      return res.status(404).json({ message: 'Maintenance log not found' });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create maintenance log
export const createMaintenanceLog = async (req, res) => {
  try {
    const { vehicleId, serviceType, cost, date, notes } = req.body;
    
    // Validate vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Rule 9: Creating an active maintenance record sets vehicle to In Shop
    if (vehicle.status !== 'Retired') {
      vehicle.status = 'In Shop';
      await vehicle.save();
    }
    
    // Create maintenance log
    const log = await MaintenanceLog.create({
      vehicleId,
      serviceType,
      cost,
      date: date || new Date(),
      status: 'Active',
      notes
    });
    
    // Create associated expense
    await Expense.create({
      vehicleId,
      linkedMaintenanceCost: cost,
      total: cost
    });
    
    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('vehicleId', 'registrationNumber nameModel type');
    
    res.status(201).json(populatedLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Complete maintenance (close record)
export const completeMaintenance = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id)
      .populate('vehicleId');
    
    if (!log) {
      return res.status(404).json({ message: 'Maintenance log not found' });
    }
    
    if (log.status === 'Completed') {
      return res.status(400).json({ message: 'Maintenance already completed' });
    }
    
    // Rule 10: Closing a record restores vehicle to Available, unless Retired
    const vehicle = await Vehicle.findById(log.vehicleId._id);
    if (vehicle && vehicle.status !== 'Retired') {
      vehicle.status = 'Available';
      await vehicle.save();
    }
    
    log.status = 'Completed';
    await log.save();
    
    const populatedLog = await MaintenanceLog.findById(log._id)
      .populate('vehicleId', 'registrationNumber nameModel type');
    
    res.json(populatedLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete maintenance log
export const deleteMaintenanceLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ message: 'Maintenance log not found' });
    }
    
    // If maintenance is active, restore vehicle status
    if (log.status === 'Active') {
      const vehicle = await Vehicle.findById(log.vehicleId);
      if (vehicle && vehicle.status === 'In Shop') {
        vehicle.status = 'Available';
        await vehicle.save();
      }
    }
    
    await log.deleteOne();
    res.json({ message: 'Maintenance log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get maintenance statistics
export const getMaintenanceStats = async (req, res) => {
  try {
    const stats = await MaintenanceLog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          avgCost: { $avg: '$cost' }
        }
      }
    ]);
    
    const totalCost = stats.reduce((acc, curr) => acc + curr.totalCost, 0);
    const activeCount = stats.find(s => s._id === 'Active')?.count || 0;
    const completedCount = stats.find(s => s._id === 'Completed')?.count || 0;
    
    res.json({
      total: stats.reduce((acc, curr) => acc + curr.count, 0),
      active: activeCount,
      completed: completedCount,
      totalCost,
      byStatus: stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get maintenance by vehicle
export const getMaintenanceByVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const logs = await MaintenanceLog.find({ vehicleId })
      .populate('vehicleId', 'registrationNumber nameModel type')
      .sort({ date: -1 });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};