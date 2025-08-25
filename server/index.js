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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
