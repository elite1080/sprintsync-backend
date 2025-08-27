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

const getTimeTracked = async (req, res) => {
  try {
    const userId = req.user.id;
    let query = '';
    let params = [];
    const isAdmin = req.user.isAdmin;
    console.log('isAdmin', isAdmin);  
    if (isAdmin) {
      // Get sum of minutes per date for all time logs of all users with user details
      query = `
        SELECT 
          DATE(tl.logged_at) as date,
          u.id as user_id,
          u.username,
          SUM(tl.minutes) as total_minutes,
          COUNT(*) as log_count
        FROM time_logs tl
        JOIN users u ON tl.user_id = u.id
        GROUP BY DATE(tl.logged_at), u.id, u.username
        ORDER BY date DESC, u.username
      `;
    } else {
      // Get sum of minutes per date for all time logs of the user
      query = `
        SELECT 
          DATE(logged_at) as date,
          SUM(minutes) as total_minutes,
          COUNT(*) as log_count
        FROM time_logs 
        WHERE user_id = ? 
        GROUP BY DATE(logged_at) 
        ORDER BY date DESC
      `;
    }
    
    params = req.user.isAdmin ? [] : [userId];    
    
    db.all(query, params, (err, timeLogs) => {
      if (err) {
        logger.error('Time tracking error', { error: err.message });
        return res.status(500).json({ error: 'Failed to fetch time logs' });
      }

      const timeLogsList = timeLogs || [];
      
      if (timeLogsList.length === 0) {
        return res.json({ 
          timeLogs: [],
          message: 'No time logs found. Start tracking your time to see your progress!',
          isEmpty: true
        });
      }

              // For admin users, group by date and show user breakdown
        if (isAdmin) {
          const groupedByDate = {};
          timeLogsList.forEach(log => {
            if (!groupedByDate[log.date]) {
              groupedByDate[log.date] = {
                date: log.date,
                total_minutes: 0,
                total_log_count: 0,
                auto_logged_minutes: 0,
                manual_logged_minutes: 0,
                users: []
              };
            }
            groupedByDate[log.date].total_minutes += log.total_minutes;
            groupedByDate[log.date].total_log_count += log.log_count;
            
            // Track auto-logged vs manual time
            if (log.is_auto_logged) {
              groupedByDate[log.date].auto_logged_minutes += log.total_minutes;
            } else {
              groupedByDate[log.date].manual_logged_minutes += log.total_minutes;
            }
            
            groupedByDate[log.date].users.push({
              user_id: log.user_id,
              username: log.username,
              minutes: log.total_minutes,
              log_count: log.log_count,
              is_auto_logged: log.is_auto_logged || false
            });
          });

        const adminResponse = Object.values(groupedByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return res.json({ 
          timeLogs: adminResponse,
          message: `Found time logs for ${adminResponse.length} day(s) across all users`,
          isEmpty: false,
          isAdmin: true,
          summary: {
            total_days: adminResponse.length,
            total_minutes: adminResponse.reduce((sum, day) => sum + day.total_minutes, 0),
            auto_logged_minutes: adminResponse.reduce((sum, day) => sum + day.auto_logged_minutes, 0),
            manual_logged_minutes: adminResponse.reduce((sum, day) => sum + day.manual_logged_minutes, 0)
          }
        });
      }

      res.json({ 
        timeLogs: timeLogsList,
        message: `Found time logs for ${timeLogsList.length} day(s)`,
        isEmpty: false
      });
    });
  } catch (error) {
    logger.error('Time tracking error', { error: error.message });
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

    // First, get the current task to check its status and estimated time
    db.get(
      'SELECT status, total_minutes FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId],
      (err, currentTask) => {
        if (err) {
          logger.error('Task fetch error during status update', { error: err.message });
          return res.status(500).json({ error: 'Failed to fetch task' });
        }

        if (!currentTask) {
          return res.status(404).json({ 
            error: 'Task not found',
            message: 'The task you are trying to update does not exist or you do not have access to it'
          });
        }

        const previousStatus = currentTask.status;
        const estimatedMinutes = currentTask.total_minutes || 0;

        // Update the task status
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

            // Handle automatic time logging based on status change
            if (status === 'done' && previousStatus !== 'done' && estimatedMinutes > 0) {
              // Task was marked as done - log the estimated time
              const timeLogId = uuidv4();
              const now = new Date().toISOString();
              
              db.run(
                'INSERT INTO time_logs (id, task_id, user_id, minutes, logged_at, is_auto_logged) VALUES (?, ?, ?, ?, ?, ?)',
                [timeLogId, id, userId, estimatedMinutes, now, 1],
                function(err) {
                  if (err) {
                    logger.error('Auto time logging error', { error: err.message });
                    // Don't fail the status update, just log the error
                  }
                }
              );
            } else if ((status === 'in_progress' || status === 'todo') && previousStatus === 'done') {
              // Task was moved back from done - remove the auto-logged time
              db.run(
                'DELETE FROM time_logs WHERE task_id = ? AND user_id = ? AND is_auto_logged = 1',
                [id, userId],
                function(err) {
                  if (err) {
                    logger.error('Auto time log removal error', { error: err.message });
                    // Don't fail the status update, just log the error
                  }
                }
              );
            }

            res.json({ 
              message: 'Task status updated successfully', 
              status,
              changes: this.changes,
              autoTimeLogged: status === 'done' && previousStatus !== 'done' && estimatedMinutes > 0,
              autoTimeRemoved: (status === 'in_progress' || status === 'todo') && previousStatus === 'done'
            });
          }
        );
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
  logTime,
  getTimeTracked
};
