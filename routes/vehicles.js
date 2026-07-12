import express from 'express';
import { protect } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleCheck.js';
import {
  getVehicles,
  getAvailableVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleStats,
  bulkUpdateVehicleStatus
} from '../controllers/vehicleController.js';

const vehicleRoutes = express.Router();

vehicleRoutes.get('/', protect, getVehicles);
vehicleRoutes.get('/available', protect, getAvailableVehicles);
vehicleRoutes.get('/stats', protect, getVehicleStats);
vehicleRoutes.get('/:id', protect, getVehicleById);
vehicleRoutes.post('/', protect, checkRole('FleetManager'), createVehicle);
vehicleRoutes.put('/:id', protect, checkRole('FleetManager'), updateVehicle);
vehicleRoutes.delete('/:id', protect, checkRole('FleetManager'), deleteVehicle);
vehicleRoutes.put('/bulk/status', protect, checkRole('FleetManager'), bulkUpdateVehicleStatus);

export default vehicleRoutes;