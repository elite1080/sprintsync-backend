const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { logger } = require('../utils/logger');

const getAllUsers = async (req, res) => {
  try {
    db.all(
      'SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC',
      (err, users) => {
        if (err) {
          logger.error('User fetch error', { error: err.message });
          return res.status(500).json({ error: 'Failed to fetch users' });
        }

        const userList = users || [];
        
        if (userList.length === 0) {
          return res.json({ 
            users: [],
            message: 'No users found in the system. Register the first user to get started!',
            isEmpty: true
          });
        }

        res.json({ 
          users: userList,
          message: `Found ${userList.length} user(s)`,
          isEmpty: false
        });
      }
    );
  } catch (error) {
    logger.error('User fetch error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    db.get(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?',
      [id],
      (err, user) => {
        if (err) {
          logger.error('User fetch error', { error: err.message });
          return res.status(500).json({ error: 'Failed to fetch user' });
        }

        if (!user) {
          return res.status(404).json({ 
            error: 'User not found',
            message: 'The requested user does not exist in the system'
          });
        }

        res.json({ 
          user,
          message: 'User retrieved successfully'
        });
      }
    );
  } catch (error) {
    logger.error('User fetch error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, isAdmin } = req.body;

    if (!username && !email && isAdmin === undefined) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }

    let updateFields = [];
    let params = [];

    if (username) {
      updateFields.push('username = ?');
      params.push(username);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (isAdmin !== undefined) {
      updateFields.push('is_admin = ?');
      params.push(isAdmin);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ 
            error: 'Username or email already exists',
            message: 'The username or email you are trying to use is already taken by another user'
          });
        }
        logger.error('User update error', { error: err.message });
        return res.status(500).json({ error: 'Failed to update user' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ 
          error: 'User not found',
          message: 'The user you are trying to update does not exist in the system'
        });
      }

      res.json({ 
        message: 'User updated successfully',
        changes: this.changes
      });
    });
  } catch (error) {
    logger.error('User update error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    db.run(
      'DELETE FROM users WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          logger.error('User deletion error', { error: err.message });
          return res.status(500).json({ error: 'Failed to delete user' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ 
            error: 'User not found',
            message: 'The user you are trying to delete does not exist in the system'
          });
        }

        res.json({ 
          message: 'User deleted successfully',
          changes: this.changes
        });
      }
    );
  } catch (error) {
    logger.error('User deletion error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    db.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [id],
      async (err, user) => {
        if (err) {
          logger.error('Password change error', { error: err.message });
          return res.status(500).json({ error: 'Failed to verify current password' });
        }

        if (!user) {
          return res.status(404).json({ 
            error: 'User not found',
            message: 'The user you are trying to change password for does not exist in the system'
          });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
          return res.status(401).json({ 
            error: 'Current password is incorrect',
            message: 'The current password you provided does not match your account password'
          });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        db.run(
          'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
          [newPasswordHash, new Date().toISOString(), id],
          function(err) {
            if (err) {
              logger.error('Password update error', { error: err.message });
              return res.status(500).json({ error: 'Failed to update password' });
            }

            res.json({ 
              message: 'Password changed successfully',
              changes: this.changes
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('Password change error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
};
