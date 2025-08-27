const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { logger } = require('../utils/logger');

const createTask = async (req, res) => {
  try {
    const { title, description, total_minutes = 0, status = 'todo' } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Validate total_minutes if provided
    if (total_minutes !== undefined && (isNaN(total_minutes) || total_minutes < 0)) {
      return res.status(400).json({ 
        error: 'Invalid total_minutes value',
        message: 'total_minutes must be a non-negative number'
      });
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();
    const initialTotalMinutes = total_minutes || 0;

    db.run(
      'INSERT INTO tasks (id, title, description, status, total_minutes, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, title, description, status, initialTotalMinutes, userId, now, now],
      function(err) {
        if (err) {
          logger.error('Task creation error', { error: err.message });
          return res.status(500).json({ error: 'Failed to create task' });
        }

        // Fetch the created task to get the actual database values
        db.get(
          'SELECT * FROM tasks WHERE id = ?',
          [taskId],
          (fetchErr, createdTask) => {
            if (fetchErr) {
              logger.error('Task fetch after creation error', { error: fetchErr.message });
              // Fallback to manual response if fetch fails
                             return res.status(201).json({
                 message: 'Task created successfully',
                                   task: {
                    id: taskId,
                    title,
                    description,
                    status,
                    userId,
                    total_minutes: initialTotalMinutes,
                    createdAt: now,
                    updatedAt: now
                  }
               });
            }

            res.status(201).json({
              message: 'Task created successfully',
              task: createdTask
            });
          }
        );
      }
    );
  } catch (error) {
    logger.error('Task creation error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    let params = [userId];

    if (status && ['todo', 'in_progress', 'done'].includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, tasks) => {
      if (err) {
        logger.error('Task fetch error', { error: err.message });
        return res.status(500).json({ error: 'Failed to fetch tasks' });
      }

      const taskList = tasks || [];
      
      if (taskList.length === 0) {
        const statusFilter = status ? ` with status '${status}'` : '';
        return res.json({ 
          tasks: [],
          message: `No tasks found${statusFilter}. Create your first task to get started!`,
          isEmpty: true
        });
      }

      res.json({ 
        tasks: taskList,
        message: `Found ${taskList.length} task(s)`,
        isEmpty: false
      });
    });
  } catch (error) {
    logger.error('Task fetch error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    db.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId],
      (err, task) => {
        if (err) {
          logger.error('Task fetch error', { error: err.message });
          return res.status(500).json({ error: 'Failed to fetch task' });
        }

        if (!task) {
          return res.status(404).json({ 
            error: 'Task not found',
            message: 'The requested task does not exist or you do not have access to it'
          });
        }

        res.json({ 
          task,
          message: 'Task retrieved successfully'
        });
      }
    );
  } catch (error) {
    logger.error('Task fetch error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    const userId = req.user.id;

    if (!title && !description && !status) {
      return res.status(400).json({ error: 'At least one field to update is required' });
    }

    if (status && !['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    let updateFields = [];
    let params = [];

    if (title) {
      updateFields.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id, userId);

    const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        logger.error('Task update error', { error: err.message });
        return res.status(500).json({ error: 'Failed to update task' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ 
          error: 'Task not found',
          message: 'The task you are trying to update does not exist or you do not have access to it'
        });
      }

      res.json({ 
        message: 'Task updated successfully',
        changes: this.changes
      });
    });
  } catch (error) {
    logger.error('Task update error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    db.run(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId],
      function(err) {
        if (err) {
          logger.error('Task deletion error', { error: err.message });
          return res.status(500).json({ error: 'Failed to delete task' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ 
            error: 'Task not found',
            message: 'The task you are trying to delete does not exist or you do not have access to it'
          });
        }

        res.json({ 
          message: 'Task deleted successfully',
          changes: this.changes
        });
      }
    );
  } catch (error) {
    logger.error('Task deletion error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    db.run(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [status, new Date().toISOString(), id, userId],
      function(err) {
        if (err) {
          logger.error('Task status update error', { error: err.message });
          return res.status(500).json({ error: 'Failed to update task status' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ 
            error: 'Task not found',
            message: 'The task you are trying to update does not exist or you do not have access to it'
          });
        }

        res.json({ 
          message: 'Task status updated successfully', 
          status,
          changes: this.changes
        });
      }
    );
  } catch (error) {
    logger.error('Task status update error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;
    const userId = req.user.id;

    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'Valid minutes value is required' });
    }

    const timeLogId = uuidv4();
    const now = new Date().toISOString();

    db.serialize(() => {
      db.run(
        'INSERT INTO time_logs (id, task_id, user_id, minutes, logged_at) VALUES (?, ?, ?, ?, ?)',
        [timeLogId, id, userId, minutes, now]
      );

      db.run(
        'UPDATE tasks SET total_minutes = total_minutes + ?, updated_at = ? WHERE id = ? AND user_id = ?',
        [minutes, now, id, userId],
        function(err) {
          if (err) {
            logger.error('Time logging error', { error: err.message });
            return res.status(500).json({ error: 'Failed to log time' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ 
              error: 'Task not found',
              message: 'The task you are trying to log time for does not exist or you do not have access to it'
            });
          }

          res.json({ 
            message: 'Time logged successfully',
            timeLog: { id: timeLogId, minutes, loggedAt: now },
            changes: this.changes
          });
        }
      );
    });
  } catch (error) {
    logger.error('Time logging error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  logTime
};
