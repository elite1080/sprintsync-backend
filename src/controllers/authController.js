const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { logger } = require('../utils/logger');

const register = async (req, res) => {
  try {
    const { username, email, password, isAdmin = false } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required',
        message: 'Please provide all required fields: username, email, and password'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    db.run(
      'INSERT INTO users (id, username, email, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, username, email, passwordHash, isAdmin, new Date().toISOString(), new Date().toISOString()],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ 
              error: 'Username or email already exists',
              message: 'The username or email you are trying to use is already registered. Please choose different credentials.'
            });
          }
          logger.error('User registration error', { error: err.message });
          return res.status(500).json({ 
            error: 'Registration failed',
            message: 'Unable to complete registration at this time. Please try again later.'
          });
        }

        const token = jwt.sign(
          { id: userId, username, isAdmin },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: { id: userId, username, email, isAdmin }
        });
      }
    );
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration. Please try again later.'
    });
  }
};

const login = async (req, res) => {
  console.log('Login request received');
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        message: 'Please provide both username and password to login'
      });
    }

    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          logger.error('Login database error', { error: err.message });
          return res.status(500).json({ 
            error: 'Login failed',
            message: 'Unable to process login at this time. Please try again later.'
          });
        }

        if (!user) {
          return res.status(401).json({ 
            error: 'Invalid credentials',
            message: 'Username or password is incorrect. Please check your credentials and try again.'
          });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ 
            error: 'Invalid credentials',
            message: 'Username or password is incorrect. Please check your credentials and try again.'
          });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, isAdmin: user.is_admin },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.is_admin
          }
        });
      }
    );
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred during login. Please try again later.'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    db.get(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          logger.error('Profile fetch error', { error: err.message });
          return res.status(500).json({ 
            error: 'Failed to fetch profile',
            message: 'Unable to retrieve your profile at this time. Please try again later.'
          });
        }

        if (!user) {
          return res.status(404).json({ 
            error: 'User not found',
            message: 'Your user profile could not be found. Please contact support if this issue persists.'
          });
        }

        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.is_admin,
          createdAt: user.created_at,
          message: 'Profile retrieved successfully'
        });
      }
    );
  } catch (error) {
    logger.error('Profile error', { error: error.message });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching your profile. Please try again later.'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
