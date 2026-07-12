import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get analytics overview
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Basic Counts
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
        NOT: { status: 'ARCHIVED' },
      },
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const pending = total - completed;
    
    // Check if task is overdue (not completed and past due date)
    const now = new Date();
    const overdue = tasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now).length;

    // 2. Priority Distribution
    const priorities = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    tasks.forEach(t => {
      if (priorities[t.priority] !== undefined) {
        priorities[t.priority]++;
      }
    });

    // 3. Weekly Productivity (Last 7 days, task completion count)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const endD = new Date(d);
      endD.setHours(23, 59, 59, 999);

      last7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        rawDate: d.toISOString().split('T')[0],
        completed: 0,
      });
    }

    // 4. Heatmap data (completedAt dates in the last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const completedTasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
        ],
        status: 'COMPLETED',
        completedAt: { gte: oneYearAgo },
      },
      select: { completedAt: true },
    });

    const heatmap = {};
    completedTasks.forEach(t => {
      if (t.completedAt) {
        const dateStr = t.completedAt.toISOString().split('T')[0];
        heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
      }
    });

    // Fill in last 7 days completed tasks
    last7Days.forEach(day => {
      day.completed = heatmap[day.rawDate] || 0;
    });

    // 5. Streak calculation
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check back up to 60 days to calculate streaks
    let streakCheckingDate = new Date();
    let hasCompletedTodayOrYesterday = heatmap[todayStr] > 0 || heatmap[yesterdayStr] > 0;

    if (hasCompletedTodayOrYesterday) {
      // Find current streak starting from today/yesterday going backwards
      let checkDate = heatmap[todayStr] > 0 ? new Date() : yesterday;
      while (true) {
        const checkStr = checkDate.toISOString().split('T')[0];
        if (heatmap[checkStr] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Find longest streak in last 365 days
    let checkDate = new Date(oneYearAgo);
    while (checkDate <= now) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (heatmap[checkStr] > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // 6. Time Spent
    let totalEstimated = 0;
    let totalActual = 0;
    tasks.forEach(t => {
      if (t.estimatedDuration) totalEstimated += t.estimatedDuration;
      if (t.actualDuration) totalActual += t.actualDuration;
    });

    // 7. Project distribution
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        _count: {
          select: { tasks: { where: { NOT: { status: 'ARCHIVED' } } } },
        },
      },
    });

    const projectDistribution = projects.map(p => ({
      name: p.name,
      taskCount: p._count.tasks,
      progress: p.progress,
      color: p.colorTheme,
    }));

    // Productivity Score (arbitrary weighted score: completed tasks + 5 * streaks - 2 * overdue)
    const productivityScore = Math.max(0, Math.min(100, Math.round(
      (completed * 4) + (currentStreak * 6) - (overdue * 3) + 30
    )));

    res.json({
      summary: {
        total,
        completed,
        pending,
        overdue,
        productivityScore,
        currentStreak,
        longestStreak,
      },
      priorities,
      weeklyProductivity: last7Days,
      timeSpent: {
        estimated: totalEstimated,
        actual: totalActual,
      },
      projectDistribution,
      heatmap,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
