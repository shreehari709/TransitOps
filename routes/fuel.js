import express from 'express';
import { protect } from '../middleware/auth.js';

const fuelRoutes = express.Router();

// Get all fuel logs
fuelRoutes.get('/', protect, async (req, res) => {
  try {
    res.json({ message: 'Fuel logs endpoint' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create fuel log
fuelRoutes.post('/', protect, async (req, res) => {
  try {
    res.status(201).json({ message: 'Fuel log created' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default fuelRoutes;