import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import FuelLog from '../models/FuelLog.js';
import mongoose from 'mongoose';

// Get all trips
export const getTrips = async (req, res) => {
  try {
    const { 
      status, 
      vehicleId, 
      driverId,
      startDate,
      endDate,
      page = 1,
      limit = 10 
    } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [trips, total] = await Promise.all([
      Trip.find(filter)
        .populate('vehicleId', 'registrationNumber nameModel type')
        .populate('driverId', 'name licenseNumber')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Trip.countDocuments(filter)
    ]);
    
    res.json({
      data: trips,
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

// Get single trip
export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicleId', 'registrationNumber nameModel type maxLoadCapacityKg status odometerKm')
      .populate('driverId', 'name licenseNumber licenseExpiryDate status');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create trip
export const createTrip = async (req, res) => {
  try {
    const { 
      source, 
      destination, 
      vehicleId, 
      driverId, 
      cargoWeightKg, 
      plannedDistanceKm 
    } = req.body;

    // Validate vehicle availability
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    
    // Rule 2: Retired or In Shop vehicles never appear
    if (vehicle.status !== 'Available') {
      return res.status(400).json({ 
        message: `Vehicle is ${vehicle.status} and not available for dispatch` 
      });
    }
    
    // Rule 5: Cargo weight cannot exceed vehicle capacity
    if (cargoWeightKg > vehicle.maxLoadCapacityKg) {
      return res.status(400).json({ 
        message: `Cargo weight (${cargoWeightKg}kg) exceeds vehicle capacity (${vehicle.maxLoadCapacityKg}kg)` 
      });
    }

    // Validate driver availability
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    // Rule 3: Driver with expired license or Suspended status cannot be assigned
    if (driver.status === 'Suspended') {
      return res.status(400).json({ message: 'Driver is suspended and cannot be assigned' });
    }
    if (driver.status !== 'Available') {
      return res.status(400).json({ 
        message: `Driver is ${driver.status} and not available` 
      });
    }
    if (new Date(driver.licenseExpiryDate) < new Date()) {
      return res.status(400).json({ 
        message: 'Driver license has expired. Please renew before assigning.' 
      });
    }

    // Rule 4: Vehicle or driver already On Trip cannot be assigned
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ message: 'Vehicle is already on a trip' });
    }
    if (driver.status === 'On Trip') {
      return res.status(400).json({ message: 'Driver is already on a trip' });
    }

    // Create trip
    const trip = await Trip.create({
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeightKg,
      plannedDistanceKm,
      status: 'Draft'
    });

    // Populate the trip with vehicle and driver details
    const populatedTrip = await Trip.findById(trip._id)
      .populate('vehicleId')
      .populate('driverId');

    res.status(201).json(populatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dispatch trip
export const dispatchTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicleId')
      .populate('driverId');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.status === 'Dispatched') {
      return res.status(400).json({ message: 'Trip is already dispatched' });
    }

    if (trip.status === 'Completed') {
      return res.status(400).json({ message: 'Cannot dispatch a completed trip' });
    }

    if (trip.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot dispatch a cancelled trip' });
    }

    // Re-validate business rules before dispatch
    const vehicle = await Vehicle.findById(trip.vehicleId._id);
    const driver = await Driver.findById(trip.driverId._id);

    if (!vehicle || !driver) {
      return res.status(404).json({ message: 'Vehicle or driver not found' });
    }

    // Validate vehicle status
    if (vehicle.status !== 'Available') {
      return res.status(400).json({ 
        message: `Vehicle is ${vehicle.status} and cannot be dispatched` 
      });
    }

    // Validate driver status
    if (driver.status !== 'Available') {
      return res.status(400).json({ 
        message: `Driver is ${driver.status} and cannot be dispatched` 
      });
    }

    // Validate license
    if (new Date(driver.licenseExpiryDate) < new Date()) {
      return res.status(400).json({ 
        message: 'Driver license has expired. Cannot dispatch trip.' 
      });
    }

    // Rule 6: Dispatching sets vehicle and driver to On Trip
    vehicle.status = 'On Trip';
    await vehicle.save();
    
    driver.status = 'On Trip';
    await driver.save();

    trip.status = 'Dispatched';
    trip.dispatchedAt = new Date();
    await trip.save();

    // Return populated trip
    const populatedTrip = await Trip.findById(trip._id)
      .populate('vehicleId')
      .populate('driverId');

    res.json(populatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Complete trip
export const completeTrip = async (req, res) => {
  try {
    const { closingOdometerKm, fuelConsumedLiters, revenue } = req.body;
    
    // Validate required fields
    if (!closingOdometerKm || !fuelConsumedLiters) {
      return res.status(400).json({ 
        message: 'Closing odometer and fuel consumed are required' 
      });
    }

    const trip = await Trip.findById(req.params.id)
      .populate('vehicleId')
      .populate('driverId');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ 
        message: `Only dispatched trips can be completed. Current status: ${trip.status}` 
      });
    }

    // Rule 7: Completing sets vehicle and driver back to Available
    const vehicle = await Vehicle.findById(trip.vehicleId._id);
    const driver = await Driver.findById(trip.driverId._id);

    // Update vehicle odometer
    if (closingOdometerKm) {
      if (closingOdometerKm < vehicle.odometerKm) {
        return res.status(400).json({ 
          message: 'Closing odometer cannot be less than current odometer' 
        });
      }
      vehicle.odometerKm = closingOdometerKm;
    }
    vehicle.status = 'Available';
    await vehicle.save();

    driver.status = 'Available';
    await driver.save();

    // Update trip
    trip.status = 'Completed';
    trip.closingOdometerKm = closingOdometerKm;
    trip.fuelConsumedLiters = fuelConsumedLiters;
    trip.revenue = revenue || 0;
    trip.completedAt = new Date();
    await trip.save();

    // Create fuel log
    await FuelLog.create({
      vehicleId: vehicle._id,
      tripId: trip._id,
      date: new Date(),
      liters: fuelConsumedLiters,
      cost: 0 // Cost will be added separately through fuel management
    });

    // Return populated trip
    const populatedTrip = await Trip.findById(trip._id)
      .populate('vehicleId')
      .populate('driverId');

    res.json(populatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel trip
export const cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('vehicleId')
      .populate('driverId');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.status === 'Completed') {
      return res.status(400).json({ message: 'Completed trips cannot be cancelled' });
    }

    if (trip.status === 'Cancelled') {
      return res.status(400).json({ message: 'Trip is already cancelled' });
    }

    // Rule 8: Cancelling a dispatched trip restores both vehicle and driver to Available
    if (trip.status === 'Dispatched') {
      const vehicle = await Vehicle.findById(trip.vehicleId._id);
      const driver = await Driver.findById(trip.driverId._id);
      
      if (vehicle) {
        vehicle.status = 'Available';
        await vehicle.save();
      }
      if (driver) {
        driver.status = 'Available';
        await driver.save();
      }
    }

    trip.status = 'Cancelled';
    trip.cancelledAt = new Date();
    await trip.save();

    // Return populated trip
    const populatedTrip = await Trip.findById(trip._id)
      .populate('vehicleId')
      .populate('driverId');

    res.json(populatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get trip statistics
export const getTripStats = async (req, res) => {
  try {
    const stats = await Trip.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$revenue' },
          totalFuelConsumed: { $sum: '$fuelConsumedLiters' },
          avgDistance: { $avg: '$plannedDistanceKm' }
        }
      }
    ]);
    
    const total = stats.reduce((acc, curr) => acc + curr.count, 0);
    const totalRevenue = stats.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    
    // Get active trips (Dispatched)
    const activeTrips = await Trip.countDocuments({ status: 'Dispatched' });
    const pendingTrips = await Trip.countDocuments({ status: 'Draft' });
    
    res.json({
      total,
      activeTrips,
      pendingTrips,
      totalRevenue,
      byStatus: stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get dashboard trip data
export const getDashboardTripData = async (req, res) => {
  try {
    const [activeTrips, pendingTrips, recentTrips] = await Promise.all([
      Trip.find({ status: 'Dispatched' })
        .populate('vehicleId', 'registrationNumber nameModel')
        .populate('driverId', 'name')
        .limit(10),
      Trip.countDocuments({ status: 'Draft' }),
      Trip.find()
        .populate('vehicleId', 'registrationNumber nameModel')
        .populate('driverId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);
    
    res.json({
      activeTrips,
      pendingTrips,
      recentTrips
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};