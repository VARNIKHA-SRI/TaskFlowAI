import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  richTextNotes: z.string().optional().nullable(),
  dueDate: z.string().datetime().or(z.string().length(0)).optional().nullable(),
  dueTime: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED', 'ARCHIVED']).optional(),
  estimatedDuration: z.number().optional().nullable(),
  actualDuration: z.number().optional().nullable(),
  projectId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  recurringTask: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().nullable(),
  subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
});

const subtaskSchema = z.object({
  title: z.string().min(1).optional(),
  isCompleted: z.boolean().optional(),
  order: z.number().int().optional(),
});

// Helper: Log activity
async function logActivity(projectId, userId, description) {
  if (!projectId) return;
  try {
    await prisma.activity.create({
      data: {
        projectId,
        userId,
        description,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Get all tasks (filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, priority, projectId, dueDate } = req.query;

    const where = {
      OR: [
        { creatorId: req.user.id },
        { assigneeId: req.user.id },
        {
          project: {
            OR: [
              { ownerId: req.user.id },
              { members: { some: { userId: req.user.id } } },
            ],
          },
        },
      ],
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (dueDate) {
      const start = new Date(dueDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dueDate);
      end.setHours(23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, colorTheme: true },
        },
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, colorTheme: true },
        },
        creator: {
          select: { id: true, name: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: { order: 'asc' },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const body = taskCreateSchema.parse(req.body);
    const dueDateVal = body.dueDate ? new Date(body.dueDate) : null;

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || '',
        richTextNotes: body.richTextNotes || '',
        dueDate: dueDateVal,
        dueTime: body.dueTime || null,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'TODO',
        estimatedDuration: body.estimatedDuration,
        actualDuration: body.actualDuration,
        projectId: body.projectId || null,
        creatorId: req.user.id,
        assigneeId: body.assigneeId || req.user.id, // defaults to creator
        recurringTask: body.recurringTask || null,
        subtasks: body.subtasks
          ? {
              create: body.subtasks.map((st, index) => ({
                title: st.title,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        subtasks: true,
      },
    });

    // Notify assignee if different from creator
    if (task.assigneeId && task.assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'ASSIGNED',
          message: `${req.user.name} assigned you the task: "${task.title}"`,
        },
      });
    }

    if (task.projectId) {
      await logActivity(task.projectId, req.user.id, `created task "${task.title}"`);
      await updateProjectProgress(task.projectId);
    }

    res.status(201).json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const body = taskCreateSchema.partial().parse(req.body);

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const data = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.richTextNotes !== undefined) data.richTextNotes = body.richTextNotes;
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.dueTime !== undefined) data.dueTime = body.dueTime;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
        data.completedAt = new Date();
      } else if (body.status !== 'COMPLETED') {
        data.completedAt = null;
      }
    }
    if (body.estimatedDuration !== undefined) data.estimatedDuration = body.estimatedDuration;
    if (body.actualDuration !== undefined) data.actualDuration = body.actualDuration;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
    if (body.recurringTask !== undefined) data.recurringTask = body.recurringTask;

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: { subtasks: true },
    });

    // If assignee changed, notify the new assignee
    if (body.assigneeId && body.assigneeId !== existingTask.assigneeId && body.assigneeId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: body.assigneeId,
          type: 'ASSIGNED',
          message: `${req.user.name} assigned you the task: "${updatedTask.title}"`,
        },
      });
    }

    // Log Activity & Update Project Progress
    if (existingTask.projectId) {
      if (body.status && body.status !== existingTask.status) {
        await logActivity(
          existingTask.projectId,
          req.user.id,
          `moved task "${updatedTask.title}" to ${body.status}`
        );
      }
      await updateProjectProgress(existingTask.projectId);
    }

    res.json({ task: updatedTask });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id } });

    if (task.projectId) {
      await logActivity(task.projectId, req.user.id, `deleted task "${task.title}"`);
      await updateProjectProgress(task.projectId);
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate task
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { subtasks: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const duplicatedTask = await prisma.task.create({
      data: {
        title: `${task.title} (Copy)`,
        description: task.description,
        richTextNotes: task.richTextNotes,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        priority: task.priority,
        status: task.status,
        estimatedDuration: task.estimatedDuration,
        projectId: task.projectId,
        creatorId: req.user.id,
        assigneeId: task.assigneeId,
        recurringTask: task.recurringTask,
        subtasks: {
          create: task.subtasks.map((st) => ({
            title: st.title,
            isCompleted: st.isCompleted,
            order: st.order,
          })),
        },
      },
      include: { subtasks: true },
    });

    if (task.projectId) {
      await logActivity(task.projectId, req.user.id, `duplicated task "${task.title}"`);
      await updateProjectProgress(task.projectId);
    }

    res.status(201).json({ task: duplicatedTask });
  } catch (error) {
    console.error('Duplicate task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive task
router.post('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    if (task.projectId) {
      await logActivity(task.projectId, req.user.id, `archived task "${task.title}"`);
      await updateProjectProgress(task.projectId);
    }
    res.json({ task });
  } catch (error) {
    console.error('Archive task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore task
router.post('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.update({
      where: { id },
      data: { status: 'TODO' },
    });
    if (task.projectId) {
      await logActivity(task.projectId, req.user.id, `restored task "${task.title}"`);
      await updateProjectProgress(task.projectId);
    }
    res.json({ task });
  } catch (error) {
    console.error('Restore task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SUBTASKS ROUTING
// Add Subtask
router.post('/:id/subtasks', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = z.object({ title: z.string().min(1) }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id },
      include: { subtasks: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtask = await prisma.subtask.create({
      data: {
        taskId: id,
        title,
        order: task.subtasks.length,
      },
    });

    res.status(201).json({ subtask });
  } catch (error) {
    console.error('Add subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Subtask
router.put('/:id/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { subtaskId } = req.params;
    const body = subtaskSchema.parse(req.body);

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: body,
    });

    res.json({ subtask });
  } catch (error) {
    console.error('Update subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Subtask
router.delete('/:id/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { subtaskId } = req.params;
    await prisma.subtask.delete({ where: { id: subtaskId } });
    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Delete subtask error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// COMMENTS ROUTING
// Add Comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

    const comment = await prisma.comment.create({
      data: {
        taskId: id,
        userId: req.user.id,
        content,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Comment
router.delete('/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: Recalculate project completion percentage
async function updateProjectProgress(projectId) {
  try {
    const totalTasks = await prisma.task.count({
      where: { projectId, NOT: { status: 'ARCHIVED' } },
    });

    if (totalTasks === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { progress: 0.0 },
      });
      return;
    }

    const completedTasks = await prisma.task.count({
      where: { projectId, status: 'COMPLETED' },
    });

    const progress = (completedTasks / totalTasks) * 100;

    await prisma.project.update({
      where: { id: projectId },
      data: { progress: Math.round(progress * 10) / 10 },
    });
  } catch (error) {
    console.error('Failed to update project progress:', error);
  }
}

export default router;
