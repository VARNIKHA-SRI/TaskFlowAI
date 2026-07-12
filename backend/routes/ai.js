import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to call OpenRouter API (Gemini 2.5 Flash)
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'TaskFlowAI'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from OpenRouter');
  }

  return JSON.parse(text);
}

// 1. Break down task into subtasks
router.post('/breakdown', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    try {
      const system = 'You are a task management AI. Break down the task into a structured checklist of subtask titles. Return a JSON array of strings only. Do not wrap in markdown code blocks.';
      const prompt = `Task Title: "${title}"\nDescription: "${description || ''}"\n\nGenerate between 3 to 6 logical sequential subtasks.`;
      
      const subtasks = await callGemini(prompt, system);
      return res.json({ subtasks });
    } catch (apiError) {
      console.warn('Gemini API call failed, using mock fallback:', apiError.message);
      
      // Fallback mocks based on keywords
      let mockSubtasks = [
        'Identify key requirements and scope',
        'Draft initial outline or design mockup',
        'Implement core functionality/content',
        'Review, test, and gather feedback',
        'Finalize polish and submit'
      ];

      const lower = title.toLowerCase();
      if (lower.includes('code') || lower.includes('software') || lower.includes('build')) {
        mockSubtasks = [
          'Design database schema and endpoints',
          'Implement core backend models & controllers',
          'Create frontend layout & interface components',
          'Connect frontend to API with state management',
          'Write basic integration tests & resolve bugs'
        ];
      } else if (lower.includes('study') || lower.includes('exam') || lower.includes('read')) {
        mockSubtasks = [
          'Gather all reading materials & notes',
          'Review chapter summaries & key terms',
          'Complete practice problems or study guide questions',
          'Create flashcards for active recall study',
          'Conduct a timed mock self-test'
        ];
      } else if (lower.includes('report') || lower.includes('write') || lower.includes('essay')) {
        mockSubtasks = [
          'Conduct source research and document citations',
          'Outline introduction, arguments, and conclusion',
          'Write rough first draft',
          'Proofread for grammar, flow, and tone',
          'Format final document and export to PDF'
        ];
      }

      res.json({ subtasks: mockSubtasks, note: 'Demo mode: generated using local templates.' });
    }
  } catch (error) {
    console.error('Task breakdown error:', error);
    res.status(500).json({ error: 'Failed to break down task' });
  }
});

// 2. Suggest task priority
router.post('/prioritize', authenticateToken, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    try {
      const system = 'You are a task prioritization AI. Evaluate the task details and suggest a priority level. Return a JSON object with keys "priority" (value must be one of LOW, MEDIUM, HIGH, URGENT) and "reasoning" (a single sentences explanation).';
      const prompt = `Task: "${title}"\nDescription: "${description || ''}"\nDue Date: "${dueDate || 'No deadline'}"`;
      
      const analysis = await callGemini(prompt, system);
      return res.json(analysis);
    } catch (apiError) {
      console.warn('Gemini API call failed, using mock fallback:', apiError.message);
      
      let priority = 'MEDIUM';
      let reasoning = 'Set to Medium priority as a baseline due to standard deadline bounds.';

      if (dueDate) {
        const diff = new Date(dueDate) - new Date();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 1) {
          priority = 'URGENT';
          reasoning = 'This task is due in less than 24 hours. High urgency suggested.';
        } else if (days < 3) {
          priority = 'HIGH';
          reasoning = 'The deadline is approaching within 3 days. Action is recommended soon.';
        }
      }

      const lower = title.toLowerCase();
      if (lower.includes('urgent') || lower.includes('asap') || lower.includes('blocker')) {
        priority = 'URGENT';
        reasoning = 'Task text indicates critical or blocking nature.';
      } else if (lower.includes('nice to have') || lower.includes('someday') || lower.includes('read later')) {
        priority = 'LOW';
        reasoning = 'Content indicates this task is low risk and has no immediate deadline constraints.';
      }

      res.json({ priority, reasoning, note: 'Demo mode: calculated using local time logic.' });
    }
  } catch (error) {
    console.error('Task prioritize error:', error);
    res.status(500).json({ error: 'Failed to prioritize task' });
  }
});

// 3. Optimize daily schedule
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Get user's active tasks due today or pending
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        estimatedDuration: true,
      },
      take: 8,
    });

    if (tasks.length === 0) {
      return res.json({ schedule: [], message: 'No active tasks to schedule today. Go ahead and create some!' });
    }

    try {
      const system = 'You are a scheduling assistant. Given a list of tasks, return an optimized hourly work schedule for a single day. Return a JSON array of objects. Each object must have keys "taskId", "timeSlot" (e.g. "09:00 AM - 10:30 AM"), and "note" (brief tip).';
      const prompt = `User tasks: ${JSON.stringify(tasks)}. Arrange them logically (high priority first, or logical flow).`;
      
      const schedule = await callGemini(prompt, system);
      return res.json({ schedule });
    } catch (apiError) {
      console.warn('Gemini API call failed, using mock fallback:', apiError.message);
      
      // Local schedule builder
      const sortedTasks = [...tasks].sort((a, b) => {
        const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      });

      let currentHour = 9; // starts at 9:00 AM
      const schedule = sortedTasks.map((t) => {
        const duration = t.estimatedDuration || 1;
        const startHourStr = currentHour.toString().padStart(2, '0');
        const endHourStr = (currentHour + duration).toString().padStart(2, '0');
        const timeSlot = `${startHourStr}:00 AM - ${endHourStr}:00 AM`;
        currentHour += duration;
        
        return {
          taskId: t.id,
          timeSlot,
          note: `Scheduled early based on its ${t.priority} priority. Focus with deep work.`,
        };
      });

      res.json({ schedule, note: 'Demo mode: scheduled using local priority weightings.' });
    }
  } catch (error) {
    console.error('Schedule optimization error:', error);
    res.status(500).json({ error: 'Failed to optimize schedule' });
  }
});

// 4. Summarize project progress
router.get('/project/:projectId/summary', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { NOT: { status: 'ARCHIVED' } },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.tasks.length === 0) {
      return res.json({
        summary: 'No tasks have been added to this project yet. Add some tasks to generate a progress summary.',
        completionPercent: 0,
        blockers: [],
        nextSteps: ['Add tasks to initialize project work structure'],
      });
    }

    const completed = project.tasks.filter(t => t.status === 'COMPLETED').length;
    const completionPercent = Math.round((completed / project.tasks.length) * 100);

    try {
      const system = 'You are a project manager assistant. Summarize progress of the project based on task details. Return a JSON object with keys "summary" (a concise 3-sentence summary paragraph), "blockers" (array of strings of potential bottlenecks), and "nextSteps" (array of strings of recommended immediate actions).';
      const prompt = `Project Name: "${project.name}"\nDescription: "${project.description || ''}"\nTasks: ${JSON.stringify(project.tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })))}`;
      
      const analysis = await callGemini(prompt, system);
      return res.json({
        ...analysis,
        completionPercent,
      });
    } catch (apiError) {
      console.warn('Gemini API call failed, using mock fallback:', apiError.message);
      
      // Local fallback
      const total = project.tasks.length;
      const pending = total - completed;
      const urgentCount = project.tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED').length;
      
      const summary = `The project "${project.name}" is currently ${completionPercent}% complete. Out of ${total} total tasks, ${completed} are complete and ${pending} remain active. Daily updates indicate the project is tracking at a normal velocity.`;
      
      const blockers = [];
      if (urgentCount > 0) {
        blockers.push(`There are ${urgentCount} active URGENT tasks that require immediate attention.`);
      }
      const overdueTasks = project.tasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date());
      if (overdueTasks.length > 0) {
        blockers.push(`There are ${overdueTasks.length} overdue tasks delaying the timeline.`);
      }
      if (blockers.length === 0) {
        blockers.push('No critical blockers identified. Workflow looks healthy!');
      }

      const nextSteps = project.tasks
        .filter(t => t.status !== 'COMPLETED')
        .slice(0, 3)
        .map(t => `Focus on completing task "${t.title}"`);

      if (nextSteps.length === 0) {
        nextSteps.push('Define next phase milestones and add new tasks.');
      }

      res.json({
        summary,
        completionPercent,
        blockers,
        nextSteps,
        note: 'Demo mode: compiled using local statistics.',
      });
    }
  } catch (error) {
    console.error('Project summary error:', error);
    res.status(500).json({ error: 'Failed to generate project summary' });
  }
});

export default router;
