const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { auth } = require('./user');

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find({}).populate('camera');
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Mark alert as seen
router.patch('/:id/seen', async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id },
      { seen: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Create a new alert (for testing/demo)
router.post('/', async (req, res) => {
  try {
    const { message, camera, img } = req.body;
    const alert = new Alert({ message, camera, img });
    await alert.save();
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
