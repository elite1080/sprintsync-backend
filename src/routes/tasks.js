const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  logTime,
  getTimeTracked
} = require('../controllers/taskController');

const router = express.Router();

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({
      error: 'Validation failed',
      message: errorMessages.join('. '),
      details: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - status
 *         - userId
 *       properties:
 *         id:
 *           type: string
 *           description: Unique task identifier
 *         title:
 *           type: string
 *           description: Task title
 *         description:
 *           type: string
 *           description: Task description
 *         status:
 *           type: string
 *           enum: [todo, in_progress, done]
 *           description: Task status
 *         totalMinutes:
 *           type: integer
 *           description: Total time spent on task in minutes
 *         userId:
 *           type: string
 *           description: ID of the user who owns the task
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Task creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Task last update timestamp
 *     TaskRequest:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           description: Task title
 *         description:
 *           type: string
 *           description: Task description
 *         status:
 *           type: string
 *           enum: [todo, in_progress, done]
 *           description: Task status
 *     TimeLogRequest:
 *       type: object
 *       required:
 *         - minutes
 *       properties:
 *         minutes:
 *           type: integer
 *           minimum: 1
 *           maximum: 1440
 *           description: Time spent in minutes
 */

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Access token required
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get user tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in_progress, done]
 *         description: Filter tasks by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of tasks to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tasks to skip
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: Access token required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Access token required
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Access token required
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Access token required
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update task status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, done]
 *                 description: New task status
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [todo, in_progress, done]
 *                 changes:
 *                   type: integer
 *                 autoTimeLogged:
 *                   type: boolean
 *                   description: Whether estimated time was automatically logged
 *                 autoTimeRemoved:
 *                   type: boolean
 *                   description: Whether auto-logged time was removed
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Access token required
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/tasks/{id}/time:
 *   post:
 *     summary: Log time spent on task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeLogRequest'
 *     responses:
 *       200:
 *         description: Time logged successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Access token required
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/tasks/time-tracking:
 *   get:
 *     summary: Get time tracking data
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Get time tracking data grouped by date. 
 *       For regular users: shows their own time logs.
 *       For admin users: shows all users' time logs with user details.
 *     responses:
 *       200:
 *         description: Time tracking data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timeLogs:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           total_minutes:
 *                             type: integer
 *                           log_count:
 *                             type: integer
 *                       - type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           total_minutes:
 *                             type: integer
 *                           total_log_count:
 *                             type: integer
 *                           users:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 user_id:
 *                                   type: string
 *                                 username:
 *                                   type: string
 *                                 minutes:
 *                                   type: integer
 *                                 log_count:
 *                                   type: integer
 *                                 is_auto_logged:
 *                                   type: boolean
 *                                   description: Whether this time was automatically logged
 *                           auto_logged_minutes:
 *                             type: integer
 *                             description: Total minutes from auto-logged time
 *                           manual_logged_minutes:
 *                             type: integer
 *                             description: Total minutes from manual time logging
 *                 message:
 *                   type: string
 *                 isEmpty:
 *                   type: boolean
 *                 isAdmin:
 *                   type: boolean
 *                   description: Present only for admin users
 *                 summary:
 *                   type: object
 *                   description: Summary statistics (admin only)
 *                   properties:
 *                     total_days:
 *                       type: integer
 *                       description: Number of days with time logs
 *                     total_minutes:
 *                       type: integer
 *                       description: Total minutes across all days
 *                     auto_logged_minutes:
 *                       type: integer
 *                       description: Total minutes from auto-logged time
 *                     manual_logged_minutes:
 *                       type: integer
 *                       description: Total minutes from manual time logging
 *       401:
 *         description: Access token required
 *       500:
 *         description: Internal server error
 */

const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Task description must be less than 1000 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done'])
    .withMessage('Status must be todo, in_progress, or done')
];

const validateTimeLog = [
  body('minutes')
    .isInt({ min: 1, max: 1440 })
    .withMessage('Minutes must be between 1 and 1440')
];

router.use(authenticateToken);

router.post('/', validateTask, handleValidationErrors, createTask);
router.get('/', getTasks);
router.get('/time-tracking', getTimeTracked);
router.get('/:id', getTaskById);
router.put('/:id', validateTask, handleValidationErrors, updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', [
  body('status').isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status')
], handleValidationErrors, updateTaskStatus);
router.post('/:id/time', validateTimeLog, handleValidationErrors, logTime);

module.exports = router;
