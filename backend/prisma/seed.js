import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean old data
  await prisma.activity.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.create({
    data: {
      email: 'test@taskflow.ai',
      password: hashedPassword,
      name: 'Jane Doe',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jane',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'alex@taskflow.ai',
      password: hashedPassword,
      name: 'Alex Smith',
      avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex',
    },
  });

  console.log(`Created default users: test@taskflow.ai (Jane Doe), alex@taskflow.ai`);

  // 2. Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'TaskFlow AI Platform',
      description: 'Building the next-gen AI task management application using React and Express.',
      colorTheme: 'indigo',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      ownerId: user1.id,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Academic Semester Plan',
      description: 'Courses, exams preparation, and assignments tracker.',
      colorTheme: 'emerald',
      coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      ownerId: user1.id,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Fitness & Life Habit Goals',
      description: 'Personal habit tracking, gym routines, and nutrition planning.',
      colorTheme: 'rose',
      coverImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      ownerId: user1.id,
    },
  });

  // Add members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: user1.id, role: 'OWNER' },
      { projectId: project1.id, userId: user2.id, role: 'ADMIN' },
      { projectId: project2.id, userId: user1.id, role: 'OWNER' },
      { projectId: project3.id, userId: user1.id, role: 'OWNER' },
    ],
  });

  // 3. Create Tasks
  const now = new Date();
  
  // Completed tasks across the last 30 days to build a rich Heatmap
  const tasksToCreate = [];

  // Generate some completed tasks for heatmap (last 30 days)
  for (let i = 0; i < 30; i++) {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() - i);
    // Random number of completed tasks (0 to 3) per day
    const taskCount = Math.floor(Math.random() * 3);
    
    for (let t = 0; t < taskCount; t++) {
      tasksToCreate.push({
        title: `Completed Task day -${i} #${t+1}`,
        description: 'Auto-seeded historical task for analytics rendering.',
        status: 'COMPLETED',
        priority: t === 0 ? 'LOW' : 'MEDIUM',
        creatorId: user1.id,
        assigneeId: user1.id,
        projectId: project1.id,
        createdAt: taskDate,
        updatedAt: taskDate,
        completedAt: taskDate,
        dueDate: taskDate,
      });
    }
  }

  // Active Tasks for Project 1 (TaskFlow AI Platform)
  const p1Tasks = [
    {
      title: 'Design Database Schema and Prisma Models',
      description: 'Establish SQLite mappings, indexes, and relationships for User, Project, and Tasks.',
      status: 'COMPLETED',
      priority: 'HIGH',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project1.id,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      estimatedDuration: 4.0,
      actualDuration: 4.5,
    },
    {
      title: 'Implement Auth and Session Routing',
      description: 'Set up JWT middleware, token signing, and login/register validators using bcrypt & zod.',
      status: 'COMPLETED',
      priority: 'HIGH',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project1.id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
      dueDate: new Date(),
      estimatedDuration: 6.0,
      actualDuration: 5.5,
    },
    {
      title: 'Build Frontend Kanban Drag & Drop View',
      description: 'Implement custom HTML5 Kanban Board allowing card moves across columns.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project1.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      estimatedDuration: 8.0,
    },
    {
      title: 'Configure AI Gemini API Assistant panel',
      description: 'Integrate breakdown & schedules endpoints. Require GEMINI_API_KEY.',
      status: 'TODO',
      priority: 'URGENT',
      creatorId: user1.id,
      assigneeId: user2.id,
      projectId: project1.id,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      estimatedDuration: 5.0,
    },
    {
      title: 'Draft User Documentation & API manual',
      description: 'Write complete swagger or markdown spec detailing all Express endpoints.',
      status: 'BACKLOG',
      priority: 'LOW',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project1.id,
      estimatedDuration: 3.0,
    },
    {
      title: 'Blocked: Third-party OAuth Redirect Setup',
      description: 'Awaiting client ID credentials from the Google Developer Console.',
      status: 'BLOCKED',
      priority: 'MEDIUM',
      creatorId: user1.id,
      assigneeId: user2.id,
      projectId: project1.id,
      estimatedDuration: 2.0,
    }
  ];

  // Active Tasks for Project 2 (Academic Semester Plan)
  const p2Tasks = [
    {
      title: 'Prepare Advanced Chemistry Lab Report',
      description: 'Compile reaction data, write conclusion and bibliography.',
      status: 'TODO',
      priority: 'HIGH',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project2.id,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      estimatedDuration: 3.0,
    },
    {
      title: 'Read Chapters 8-10 of Macroeconomics Textbook',
      description: 'Focus on inflation rates and monetary policies.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project2.id,
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      estimatedDuration: 2.5,
    }
  ];

  // Active Tasks for Project 3 (Habits & Personal Goals)
  const p3Tasks = [
    {
      title: 'Morning Gym Cardio Run (3 miles)',
      description: 'Maintain running streak.',
      status: 'TODO',
      priority: 'MEDIUM',
      creatorId: user1.id,
      assigneeId: user1.id,
      projectId: project3.id,
      dueDate: new Date(),
      estimatedDuration: 1.0,
      recurringTask: 'DAILY',
    }
  ];

  // Combine and create all tasks
  const allTasks = [...tasksToCreate, ...p1Tasks, ...p2Tasks, ...p3Tasks];
  
  for (const t of allTasks) {
    const created = await prisma.task.create({
      data: t,
    });

    // Add subtasks to some tasks
    if (created.title.includes('Kanban')) {
      await prisma.subtask.createMany({
        data: [
          { taskId: created.id, title: 'Implement CSS styling for status columns', isCompleted: true, order: 0 },
          { taskId: created.id, title: 'Write drag/drop event handlers in React', isCompleted: false, order: 1 },
          { taskId: created.id, title: 'Hook column drop events to DB PUT calls', isCompleted: false, order: 2 },
        ],
      });
    }

    if (created.title.includes('Database Schema')) {
      await prisma.subtask.createMany({
        data: [
          { taskId: created.id, title: 'Define relational model structures', isCompleted: true, order: 0 },
          { taskId: created.id, title: 'Verify SQLite local dev.db generated', isCompleted: true, order: 1 },
        ],
      });
    }

    // Add comments to some tasks
    if (created.title.includes('Gemini')) {
      await prisma.comment.create({
        data: {
          taskId: created.id,
          userId: user2.id,
          content: 'I have started testing the Gemini Flash endpoint. It looks highly responsive!',
        },
      });
    }
  }

  console.log(`Created ${allTasks.length} tasks and historical completion records.`);

  // 4. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        type: 'DUE_TODAY',
        message: 'Your task "Morning Gym Cardio Run" is due today!',
      },
      {
        userId: user1.id,
        type: 'COMMENT',
        message: 'Alex Smith commented on your task "Configure AI Gemini API Assistant panel"',
      },
    ],
  });

  // 5. Create Activity logs
  await prisma.activity.createMany({
    data: [
      { projectId: project1.id, userId: user1.id, description: 'created project "TaskFlow AI Platform"' },
      { projectId: project1.id, userId: user1.id, description: 'created task "Design Database Schema"' },
      { projectId: project1.id, userId: user1.id, description: 'completed task "Design Database Schema"' },
      { projectId: project1.id, userId: user2.id, description: 'commented on task "Configure AI Gemini API Assistant panel"' },
    ],
  });

  // 6. Set project completion values
  const projects = [project1, project2, project3];
  for (const p of projects) {
    const total = await prisma.task.count({ where: { projectId: p.id, NOT: { status: 'ARCHIVED' } } });
    if (total > 0) {
      const completed = await prisma.task.count({ where: { projectId: p.id, status: 'COMPLETED' } });
      await prisma.project.update({
        where: { id: p.id },
        data: { progress: Math.round((completed / total) * 100 * 10) / 10 },
      });
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
