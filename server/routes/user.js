const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Google OAuth removed
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Google OAuth removed

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, tel } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Please fill all required fields.' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Save plain password for admin demo (not secure for production)
    const user = new User({ firstName, lastName, email, password: hashedPassword, tel });
    user._plainPassword = password;
    await user.save();
    // Create JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    // Fetch full user info (without password)
    const userInfo = await User.findById(user._id).select('-password');
    res.status(201).json({ message: 'User registered successfully.', user: userInfo, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login user (simple, no JWT)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    // Create JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful.', user, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});
// Middleware to verify JWT
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    // No Authorization header, allow request to proceed
    return next();
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.warn('Malformed Authorization header:', authHeader);
    return res.status(401).json({ error: 'Malformed Authorization header. Format should be: Bearer <token>' });
  }
  const token = parts[1];
  if (!token) {
    console.warn('No token found in Authorization header');
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn('Invalid token:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// Get all users (protected)
router.get('/get', auth, async (req, res) => {
  try {
    // For admin: show plain password if available (for demo/testing only)
    const users = await User.find();
    const usersWithPlain = users.map(u => {
      return {
        ...u.toObject(),
        _plainPassword: u._plainPassword || '-',
      };
    });
    res.json(usersWithPlain);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get user info by ID (protected)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update user by ID (protected, for admin or self)
router.put('/:id', auth, async (req, res) => {
  try {
    // Only allow user to update self or admin to update anyone (add admin check if needed)
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'You can only update your own profile.' });
    }
    const { firstName, lastName, email, password } = req.body;
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) {
      // Check if email is unique
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
      updateFields.email = email;
    }
    if (password) {
      updateFields.password = await bcrypt.hash(password, 10);
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User updated.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update own user settings (protected, PATCH /api/user/settings)
router.patch('/settings', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, password } = req.body;
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) {
      // Check if email is unique
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== userId) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
      updateFields.email = email;
    }
    if (password) {
      updateFields.password = await bcrypt.hash(password, 10);
    }
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'Settings updated.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete user by ID (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Google OAuth routes removed

module.exports = router;
module.exports.auth = auth;
