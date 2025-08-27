const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { suggestTaskDescription, getDailyPlan } = require('../controllers/aiController');

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
 *     TaskSuggestionRequest:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           description: Task title for AI description generation
 *     TaskSuggestionResponse:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Original task title
 *         description:
 *           type: string
 *           description: AI-generated task description
 *         isStub:
 *           type: boolean
 *           description: Whether this is a stub response (no AI available)
 *     DailyPlanResponse:
 *       type: object
 *       properties:
 *         plan:
 *           type: string
 *           description: AI-generated daily planning suggestions
 *         isStub:
 *           type: boolean
 *           description: Whether this is a stub response (no AI available)
 *         taskCount:
 *           type: integer
 *           description: Number of tasks used for planning
 */

/**
 * @swagger
 * /api/ai/suggest:
 *   post:
 *     summary: Generate AI-powered task description
 *     tags: [AI Assistance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskSuggestionRequest'
 *     responses:
 *       200:
 *         description: Task description generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskSuggestionResponse'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Access token required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/ai/daily-plan:
 *   get:
 *     summary: Get AI-generated daily planning suggestions
 *     tags: [AI Assistance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily plan generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyPlanResponse'
 *       401:
 *         description: Access token required
 *       500:
 *         description: Internal server error
 */

const validateTaskSuggestion = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters')
];

router.use(authenticateToken);

router.post('/suggest', validateTaskSuggestion, handleValidationErrors, suggestTaskDescription);
router.get('/daily-plan', getDailyPlan);

module.exports = router;
