const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  // Temporarily bypass auth
  next();
};

module.exports = { auth };
