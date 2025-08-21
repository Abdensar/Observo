require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user');
const cameraRoutes = require('./routes/camera');
const alertRoutes = require('./routes/alert');
const cors = require('cors');
const { spawn } = require('child_process');
const { auth } = require('./middleware/auth'); // Destructure auth from exports

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/users', userRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/alerts', alertRoutes);

// Add test route for auth middleware
app.get('/api/test-auth', auth, (req, res) => {
  res.json({ 
    message: 'Authentication bypassed',
    user: {}
  });
});

app.post('/video_feed', (req, res) => {
  const { rtsp_url } = req.body;
  if (!rtsp_url) {
    return res.status(400).json({ error: 'RTSP URL is required' });
  }

  const pythonProcess = spawn('python', ['./ai/detect.py', rtsp_url]);

  pythonProcess.stdin.write(JSON.stringify({ rtsp_url }));
  pythonProcess.stdin.end();

  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');

  pythonProcess.stdout.on('data', (data) => {
    res.write(data);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
    res.end();
  });
});

app.post('/start_detection', (req, res) => {
  const { rtsp_url, features } = req.body;

  if (!rtsp_url) {
    return res.status(400).json({ error: 'RTSP URL is required' });
  }

  const featureArgs = features ? features.join(',') : '';
  const pythonProcess = spawn('python', ['ai/detect.py', rtsp_url, '--features', featureArgs]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python output: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });

  res.status(200).json({ message: 'Detection started' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
