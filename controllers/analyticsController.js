import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Trip from '../models/Trip.js';
import MaintenanceLog from '../models/MaintenanceLog.js';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import mongoose from 'mongoose';

// Get dashboard KPIs
export const getDashboardKPIs = async (req, res) => {
  try {
    // Get all KPIs in parallel
    const [
      totalVehicles,
      availableVehicles,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      totalDrivers
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'Available' }),
      Vehicle.countDocuments({ status: 'In Shop' }),
      Trip.countDocuments({ status: 'Dispatched' }),
      Trip.countDocuments({ status: 'Draft' }),
      Driver.countDocuments({ status: 'Available' }),
      Driver.countDocuments()
    ]);
    
    // Calculate fleet utilization
    const fleetUtilization = totalVehicles > 0 
      ? ((totalVehicles - availableVehicles - vehiclesInMaintenance) / totalVehicles * 100)
      : 0;
    
    res.json({
      activeVehicles: totalVehicles,
      availableVehicles,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization: Math.round(fleetUtilization * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get analytics data
export const getAnalytics = async (req, res) => {
  try {
    // Get all analytics data
    const [
      vehicles,
      trips,
      maintenanceLogs,
      fuelLogs,
      expenses
    ] = await Promise.all([
      Vehicle.find(),
      Trip.find({ status: 'Completed' }),
      MaintenanceLog.find(),
      FuelLog.find(),
      Expense.find()
    ]);
    
    // Calculate metrics
    const totalMaintenanceCost = maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + log.liters, 0);
    
    // Calculate total distance from completed trips
    const totalDistance = trips.reduce((sum, trip) => sum + trip.plannedDistanceKm, 0);
    
    // Fuel efficiency (km/l)
    const fuelEfficiency = totalFuelLiters > 0 
      ? Math.round((totalDistance / totalFuelLiters) * 100) / 100
      : 0;
    
    // Fleet utilization
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
    const fleetUtilization = totalVehicles > 0 
      ? Math.round(((totalVehicles - availableVehicles) / totalVehicles) * 1000) / 10
      : 0;
    
    // Operational cost
    const operationalCost = totalMaintenanceCost + totalFuelCost;
    
    // Calculate ROI per vehicle
    const vehicleROI = await Promise.all(vehicles.map(async (vehicle) => {
      const vehicleTrips = await Trip.find({ 
        vehicleId: vehicle._id, 
        status: 'Completed' 
      });
      
      const vehicleMaintenance = await MaintenanceLog.find({ 
        vehicleId: vehicle._id 
      });
      
      const vehicleFuel = await FuelLog.find({ 
        vehicleId: vehicle._id 
      });
      
      const revenue = vehicleTrips.reduce((sum, trip) => sum + (trip.revenue || 0), 0);
      const maintenanceCost = vehicleMaintenance.reduce((sum, log) => sum + log.cost, 0);
      const fuelCost = vehicleFuel.reduce((sum, log) => sum + log.cost, 0);
      
      const totalCost = maintenanceCost + fuelCost;
      const roi = vehicle.acquisitionCost > 0 
        ? ((revenue - totalCost) / vehicle.acquisitionCost) * 100
        : 0;
      
      return {
        vehicle: vehicle.nameModel,
        registrationNumber: vehicle.registrationNumber,
        revenue,
        maintenanceCost,
        fuelCost,
        totalCost,
        acquisitionCost: vehicle.acquisitionCost,
        roi: Math.round(roi * 100) / 100
      };
    }));
    
    // Monthly revenue data for chart
    const monthlyRevenue = await Trip.aggregate([
      {
        $match: { 
          status: 'Completed',
          revenue: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$revenue' },
          tripCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 12
      }
    ]);
    
    // Top costliest vehicles
    const topCostliest = [...vehicleROI]
      .sort((a, b) => (b.maintenanceCost + b.fuelCost) - (a.maintenanceCost + a.fuelCost))
      .slice(0, 5);
    
    res.json({
      fuelEfficiency,
      fleetUtilization,
      operationalCost,
      vehicleROI,
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: `${item._id.month}/${item._id.year}`,
        revenue: item.totalRevenue,
        trips: item.tripCount
      })),
      topCostliest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export analytics data as CSV
export const exportAnalyticsCSV = async (req, res) => {
  try {
    const { type } = req.query;
    let data = [];
    let headers = [];
    
    switch(type) {
      case 'vehicles':
        const vehicles = await Vehicle.find();
        headers = ['Registration Number', 'Name/Model', 'Type', 'Capacity (kg)', 'Odometer (km)', 'Status'];
        data = vehicles.map(v => [
          v.registrationNumber,
          v.nameModel,
          v.type,
          v.maxLoadCapacityKg,
          v.odometerKm,
          v.status
        ]);
        break;
        
      case 'trips':
        const trips = await Trip.find()
          .populate('vehicleId', 'registrationNumber')
          .populate('driverId', 'name');
        headers = ['Trip Code', 'Source', 'Destination', 'Vehicle', 'Driver', 'Status', 'Revenue'];
        data = trips.map(t => [
          t.tripCode,
          t.source,
          t.destination,
          t.vehicleId?.registrationNumber || 'N/A',
          t.driverId?.name || 'N/A',
          t.status,
          t.revenue || 0
        ]);
        break;
        
      case 'maintenance':
        const maintenance = await MaintenanceLog.find()
          .populate('vehicleId', 'registrationNumber');
        headers = ['Vehicle', 'Service Type', 'Cost', 'Date', 'Status'];
        data = maintenance.map(m => [
          m.vehicleId?.registrationNumber || 'N/A',
          m.serviceType,
          m.cost,
          m.date.toISOString().split('T')[0],
          m.status
        ]);
        break;
        
      case 'fuel':
        const fuelLogs = await FuelLog.find()
          .populate('vehicleId', 'registrationNumber');
        headers = ['Vehicle', 'Date', 'Liters', 'Cost'];
        data = fuelLogs.map(f => [
          f.vehicleId?.registrationNumber || 'N/A',
          f.date.toISOString().split('T')[0],
          f.liters,
          f.cost
        ]);
        break;
        
      default:
        // Full analytics
        const analytics = await getAnalyticsData();
        headers = ['Metric', 'Value'];
        data = [
          ['Fuel Efficiency (km/l)', analytics.fuelEfficiency],
          ['Fleet Utilization (%)', analytics.fleetUtilization],
          ['Operational Cost', analytics.operationalCost]
        ];
    }
    
    // Create CSV
    let csv = headers.join(',') + '\n';
    csv += data.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics_${type || 'full'}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function for analytics data
async function getAnalyticsData() {
  const [vehicles, trips, maintenanceLogs, fuelLogs] = await Promise.all([
    Vehicle.find(),
    Trip.find({ status: 'Completed' }),
    MaintenanceLog.find(),
    FuelLog.find()
  ]);
  
  const totalMaintenanceCost = maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + log.liters, 0);
  const totalDistance = trips.reduce((sum, trip) => sum + trip.plannedDistanceKm, 0);
  const fuelEfficiency = totalFuelLiters > 0 ? Math.round((totalDistance / totalFuelLiters) * 100) / 100 : 0;
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const fleetUtilization = totalVehicles > 0 ? Math.round(((totalVehicles - availableVehicles) / totalVehicles) * 1000) / 10 : 0;
  const operationalCost = totalMaintenanceCost + totalFuelCost;
  
  return { fuelEfficiency, fleetUtilization, operationalCost };
}