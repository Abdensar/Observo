// server/routes/camera.js
const express = require('express');
const router = express.Router();
const Camera = require('../models/Camera');
const { spawn } = require('child_process');
const axios = require('axios');

// Store active detection processes
const detectionProcesses = new Map();

// Create camera and start detection
router.post('/', async (req, res) => {
  try {
    const { name, status, src, features, zone_points } = req.body;

    // Validation
    if (!name || !src) {
      return res.status(400).json({ error: 'Name and URL required' });
    }

    // Create camera
    const camera = new Camera({
      name,
      status,
      src,
      features: features || [],
      zone_points: zone_points || []
    });
    await camera.save();

    // Start detection and only then send response
    try {
      await startDetection(camera);
      res.status(201).json(camera);
    } catch (detectErr) {
      console.error('Detection failed:', detectErr);
      // Still return success since camera was created
      res.status(201).json({
        ...camera.toObject(),
        warning: 'Camera created but detection failed'
      });
    }
  } catch (err) {
    console.error('Camera creation failed:', err);
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message 
    });
  }
});

// Start detection process
router.post('/api/camera/:id/detection', async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    await startDetection(camera);
    res.json({ message: 'Detection started' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start detection' });
  }
});

// Stop detection
router.delete('/api/camera/:id/detection', async (req, res) => {
  try {
    const cameraId = req.params.id;
    
    // Stop via API
    try {
      await axios.post(`http://localhost:5002/stop`);
    } catch (err) {
      console.error('Error stopping detection via API:', err.message);
    }
    
    // Stop local process if any
    if (detectionProcesses.has(cameraId)) {
      detectionProcesses.get(cameraId).kill();
      detectionProcesses.delete(cameraId);
    }
    
    res.json({ message: 'Detection stopped' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop detection' });
  }
});

// Get camera video feed
router.get('/:id/video_feed', async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Handle RTSP streams directly
    if (camera.src.startsWith('rtsp')) {
      return res.redirect(camera.src);
    }

    // Proxy RTSP through detection service
    const response = await axios({
      method: 'get',
      url: `http://localhost:5002/video_feed`,
      responseType: 'stream'
    });
    
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get video feed' });
  }
});

// Get camera alerts
router.get('/api/camera/:id/alerts', async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Get alerts from detection service
    const response = await axios.get(`http://localhost:5002/alerts`, {
      params: { camera_id: camera._id },
      timeout: 5000
    });
    
    if (!response.data || !Array.isArray(response.data.alerts)) {
      return res.status(500).json({ error: 'Invalid alerts data format' });
    }
    
    res.json({ alerts: response.data.alerts });
  } catch (err) {
    console.error('Failed to get alerts:', err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ 
      error: 'Failed to get alerts',
      details: status === 500 ? undefined : err.message
    });
  }
});

// Get all cameras
router.get('/', async (req, res) => {
  try {
    const cameras = await Camera.find({});
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

// Get a single camera
router.get('/:id', async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json(camera);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch camera' });
  }
});

// Update a camera
router.put('/:id', async (req, res) => {
  try {
    const { name, status, src, features, zone_points } = req.body;

    // Validation
    if (!name || !src) {
      return res.status(400).json({ error: 'Name and URL required' });
    }

    const camera = await Camera.findByIdAndUpdate(
      req.params.id,
      { name, status, src, features, zone_points },
      { new: true }
    );

    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    res.json(camera);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// Delete a camera
router.delete('/:id', async (req, res) => {
  try {
    const camera = await Camera.findByIdAndDelete(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json({ message: 'Camera deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

// Helper function to start detection
async function startDetection(camera) {
  const cameraId = camera._id.toString();
  
  // Stop existing process if any
  if (detectionProcesses.has(cameraId)) {
    detectionProcesses.get(cameraId).kill();
    detectionProcesses.delete(cameraId);
  }

  try {
    // Start via API
    const response = await axios.post('http://localhost:5002/start', {
      rtsp_url: camera.src,
      camera_id: cameraId,
      features: camera.features,
      zone_points: camera.zone_points,
      backend_url: process.env.BACKEND_URL || 'http://localhost:5000'
    }, {
      timeout: 5000 // 5 second timeout
    });
    
    if (response.status !== 200) {
      throw new Error(`API returned ${response.status}`);
    }
    
    console.log(`Detection started for camera ${cameraId} via API`);
  } catch (err) {
    console.error('Failed to start detection via API, falling back to subprocess:', err.message);
    
    // Fallback to subprocess
    if (!camera.src) {
      throw new Error('No video source provided');
    }

    const process = spawn('python', [
      'detect.py',
      '--source', camera.src,
      '--features', camera.features ? camera.features.join(',') : '',
      '--camera_id', cameraId,
      '--port', '5002'
    ]);

    // Handle process output
    process.stdout.on('data', (data) => {
      console.log(`Detection output: ${data}`);
    });

    process.stderr.on('data', (data) => {
      console.error(`Detection error: ${data}`);
    });

    // Store process reference
    detectionProcesses.set(cameraId, process);
  }
}

module.exports = router;