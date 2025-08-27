const OpenAI = require('openai');
const { logger } = require('../utils/logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateTaskDescription = async (title) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        description: `Task: ${title}\n\nThis is a placeholder description. Set OPENAI_API_KEY to generate AI-powered descriptions.`,
        isStub: true
      };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful engineering team assistant. Generate concise, actionable task descriptions for sprint planning."
        },
        {
          role: "user",
          content: `Generate a clear, actionable description for this task: "${title}". Keep it under 200 words and focus on what needs to be done.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return {
      description: completion.choices[0].message.content,
      isStub: false
    };
  } catch (error) {
    logger.error('AI service error', { error: error.message });
    return {
      description: `Task: ${title}\n\nError generating AI description: ${error.message}`,
      isStub: true
    };
  }
};

const generateDailyPlan = async (userId, tasks) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        plan: "Set OPENAI_API_KEY to generate AI-powered daily plans.",
        isStub: true
      };
    }

    const taskSummary = tasks.map(task => 
      `- ${task.title} (${task.status}, ${task.total_minutes}min)`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful engineering team assistant. Generate concise daily planning suggestions based on current tasks."
        },
        {
          role: "user",
          content: `Based on these tasks:\n${taskSummary}\n\nGenerate a concise daily plan with 3-5 actionable suggestions for today. Focus on prioritization and time management.`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return {
      plan: completion.choices[0].message.content,
      isStub: false
    };
  } catch (error) {
    logger.error('AI daily plan error', { error: error.message });
    return {
      plan: "Error generating daily plan. Please try again later.",
      isStub: true
    };
  }
};

module.exports = {
  generateTaskDescription,
  generateDailyPlan
};
