import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  coverImage: z.string().url().or(z.string().length(0)).optional().nullable(),
  colorTheme: z.enum(['violet', 'indigo', 'emerald', 'amber', 'rose']).optional(),
  deadline: z.string().datetime().or(z.string().length(0)).optional().nullable(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

// Helper: Log activity
async function logActivity(projectId, userId, description) {
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

// Get all projects for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const body = projectSchema.parse(req.body);
    const deadlineVal = body.deadline ? new Date(body.deadline) : null;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description || '',
        coverImage: body.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        colorTheme: body.colorTheme || 'indigo',
        deadline: deadlineVal,
        ownerId: req.user.id,
      },
    });

    // Automatically add owner to members
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: req.user.id,
        role: 'OWNER',
      },
    });

    await logActivity(project.id, req.user.id, `created project "${project.name}"`);

    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member/owner
    const isMember = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: req.user.id },
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatarUrl: true },
            },
            subtasks: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const body = projectSchema.parse(req.body);

    // Check permission (must be owner or ADMIN)
    const memberShip = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: req.user.id },
    });

    if (!memberShip || (memberShip.role !== 'OWNER' && memberShip.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.coverImage !== undefined) data.coverImage = body.coverImage;
    if (body.colorTheme !== undefined) data.colorTheme = body.colorTheme;
    if (body.deadline !== undefined) {
      data.deadline = body.deadline ? new Date(body.deadline) : null;
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data,
    });

    await logActivity(id, req.user.id, `updated project details`);

    res.json({ project: updatedProject });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Only owner can delete
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the project owner can delete it' });
    }

    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite member to project
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = inviteSchema.parse(req.body);

    // Check permission (must be OWNER or ADMIN)
    const memberShip = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: req.user.id },
    });

    if (!memberShip || (memberShip.role !== 'OWNER' && memberShip.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Find the user to add
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      return res.status(404).json({ error: `User with email "${email}" not found` });
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: userToAdd.id,
        role: role || 'MEMBER',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Create a notification for the invited user
    await prisma.notification.create({
      data: {
        userId: userToAdd.id,
        type: 'INVITE',
        message: `${req.user.name} added you to project "${memberShip.role === 'OWNER' ? 'their project' : 'a project'}"`,
      },
    });

    await logActivity(id, req.user.id, `added ${userToAdd.name} to the project`);

    res.status(201).json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check permissions
    const requestorMember = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: req.user.id },
    });

    if (!requestorMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can remove self, or must be owner/admin to remove others
    const isSelf = req.user.id === userId;
    const isAuthorized = isSelf || requestorMember.role === 'OWNER' || requestorMember.role === 'ADMIN';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Check if user to remove is owner
    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (targetMember.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    await logActivity(id, req.user.id, `removed a member from the project`);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project activity feed
router.get('/:id/activities', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify member
    const isMember = await prisma.projectMember.findFirst({
      where: { projectId: id, userId: req.user.id },
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const activities = await prisma.activity.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ activities });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
