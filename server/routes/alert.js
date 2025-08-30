const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { auth } = require('./user');
const multer = require('multer');
const upload = multer();

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
router.post('/', upload.single('img'), async (req, res) => {
  try {
    const { message, camera, user } = req.body;
    let img = undefined;
    if (req.file) {
      img = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }
    // Debug: log incoming data and types
    console.log('POST /api/alerts body:', req.body);
    console.log('camera:', camera, 'user:', user);
    // Validate ObjectIds
    if (!camera || !user) {
      return res.status(400).json({ error: 'Camera and User are required.' });
    }
    const alert = new Alert({ message, camera, user, img });
    await alert.save();
    res.status(201).json(alert);
  } catch (err) {
    console.error('Failed to create alert:', err);
    res.status(500).json({ error: 'Server error.', details: err.message });
  }
});

// GET /api/alerts/:id/image - Stream alert image
router.get('/:id/image', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert || !alert.img || !alert.img.data) {
      return res.status(404).json({ error: 'Image not found.' });
    }
    res.set('Content-Type', alert.img.contentType || 'image/jpeg');
    res.send(alert.img.data);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
