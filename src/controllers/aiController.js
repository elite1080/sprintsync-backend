const { generateTaskDescription, generateDailyPlan } = require('../services/aiService');
const { getTasks } = require('./taskController');
const { logger } = require('../utils/logger');

const suggestTaskDescription = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ 
        error: 'Task title is required',
        message: 'Please provide a task title to generate a description'
      });
    }

    const result = await generateTaskDescription(title);
    
    res.json({
      title,
      description: result.description,
      isStub: result.isStub,
      message: result.isStub 
        ? 'Description generated (stub mode - set OPENAI_API_KEY for AI-powered descriptions)'
        : 'AI-powered description generated successfully'
    });
  } catch (error) {
    logger.error('AI suggestion error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to generate suggestion',
      message: 'Unable to generate task description at this time. Please try again later.'
    });
  }
};

const getDailyPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const mockReq = { user: { id: userId }, query: {} };
    const mockRes = {
      json: (data) => {
        if (data.tasks) {
          if (data.isEmpty) {
            return res.json({
              plan: "You don't have any tasks yet. Create some tasks to get personalized daily planning suggestions!",
              isStub: true,
              taskCount: 0,
              message: 'No tasks available for daily planning'
            });
          }
          
          generateDailyPlan(userId, data.tasks)
            .then(result => {
              res.json({
                plan: result.plan,
                isStub: result.isStub,
                taskCount: data.tasks.length,
                message: result.isStub 
                  ? 'Daily plan generated (stub mode - set OPENAI_API_KEY for AI-powered planning)'
                  : `AI-generated daily plan based on ${data.tasks.length} task(s)`
              });
            })
            .catch(error => {
              logger.error('Daily plan generation error', { error: error.message });
              res.status(500).json({ 
                error: 'Failed to generate daily plan',
                message: 'Unable to generate daily plan at this time. Please try again later.'
              });
            });
        }
      }
    };

    await getTasks(mockReq, mockRes);
  } catch (error) {
    logger.error('Daily plan error', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to generate daily plan',
      message: 'Unable to generate daily plan at this time. Please try again later.'
    });
  }
};

module.exports = {
  suggestTaskDescription,
  getDailyPlan
};
