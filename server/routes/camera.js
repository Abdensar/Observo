// server/routes/camera.js
const express = require('express');
const router = express.Router();
const Camera = require('../models/Camera');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const http = require('http');

router.post('/', async (req, res) => {
  try {
    const { name, status, src, features, user } = req.body;

    // Validation
    if (!name || !src) {
      return res.status(400).json({ error: 'Name and URL required' });
    }

    // Only allow valid feature values (as per model)
    const allowedFeatures = ['1', '2', '3'];
    const filteredFeatures = (features || []).filter(f => allowedFeatures.includes(f));

    // Create camera strictly matching the schema
    const camera = new Camera({
      name,
      status: status || 'active',
      src,
      features: filteredFeatures,
      user: user || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await camera.save();
    res.status(201).json(camera);
  } catch (err) {
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message 
    });
  }
});

// Proxy video feed from Python backend
router.get('/:id/video_feed', async (req, res) => {
  const cameraId = req.params.id;
  const pythonUrl = `http://127.0.0.1:5000/video_feed/${cameraId}`;

  // Set headers for MJPEG stream
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');

  http.get(pythonUrl, (pyRes) => {
    pyRes.on('data', (chunk) => {
      res.write(chunk);
    });
    pyRes.on('end', () => {
      res.end();
    });
    pyRes.on('error', (err) => {
      res.status(502).end('Python backend error');
    });
  }).on('error', (err) => {
    res.status(502).end('Could not connect to Python backend');
  });
});

// // Get camera video feed
// router.get('/:id/video_feed_original', async (req, res) => {
//   try {
//     const camera = await Camera.findById(req.params.id);
//     if (!camera) {
//       return res.status(404).json({ message: 'Camera not found' });
//     }
    
//     res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    
//     const pythonProcess = spawn('python', [
//       path.join(__dirname, '../../ai/detect.py'),
//       '--source', camera.src,
//       '--features', camera.features.join(','),
//       '--camera_id', camera._id.toString()
//     ]);
    
//     pythonProcess.stdout.on('data', (data) => {
//       res.write(data);
//     });
    
//     pythonProcess.stderr.on('data', (data) => {
//       console.error(`Detection error: ${data}`);
//     });
    
//     req.on('close', () => {
//       pythonProcess.kill();
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// Get camera alerts
router.get('/:id/alerts', async (req, res) => {
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

// Start detection for a specific camera
router.post('/:id/start-detection', async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    await startDetection(camera);
    res.json({ 
      message: 'Detection started',
      video_feed_url: `${req.protocol}://${req.get('host')}/api/cameras/${camera._id}/video_feed`
    });
  } catch (err) {
    res.status(500).json({ 
      error: 'Failed to start detection',
      details: err.message 
    });
  }
});

// Helper function to start detection
async function startDetection(camera) {
  const cameraId = camera._id.toString();
  
  try {
    // Start via API
    const response = await axios.post('http://localhost/start', {
      rtsp_url: camera.src,
      features: camera.features.join(',')
    }, {
      timeout: 5000
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
      path.join(__dirname, '../ai/detect.py'),
      '--camera_url', camera.src,
      '--features', camera.features.join(',')
    ]);

    // Handle process output
    process.stdout.on('data', (data) => {
      console.log(`Detection output: ${data}`);
    });

    process.stderr.on('data', (data) => {
      console.log(`Detection log: ${data}`);
    });
  }
}

module.exports = router;