import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  MoreVertical,
  Calendar as CalendarIcon,
  MessageSquare,
  CheckSquare,
  AlertCircle,
  Copy,
  Archive,
  User as UserIcon,
  Trash2,
  ListTodo,
  FileText
} from 'lucide-react';

const COLUMNS = [
  { id: 'BACKLOG', name: 'Backlog', color: 'border-slate-500 bg-slate-500/5' },
  { id: 'TODO', name: 'To Do', color: 'border-blue-500 bg-blue-500/5' },
  { id: 'IN_PROGRESS', name: 'In Progress', color: 'border-amber-500 bg-amber-500/5' },
  { id: 'REVIEW', name: 'Review', color: 'border-purple-500 bg-purple-500/5' },
  { id: 'COMPLETED', name: 'Completed', color: 'border-emerald-500 bg-emerald-500/5' },
];

export const Kanban: React.FC = () => {
  const { apiFetch, user } = useAuth();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  
  // Detail Modal State
  const [activeTask, setActiveTask] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  
  // Create Task State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState('TODO');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    projectId: '',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeId: '',
  });

  const fetchData = async () => {
    try {
      const projectsRes = await apiFetch('/projects');
      setProjects(projectsRes.projects);
      
      const tasksRes = await apiFetch('/tasks');
      setTasks(tasksRes.tasks.filter((t: any) => t.status !== 'ARCHIVED'));

      // Populate dummy project members as available users
      const allUsers: any[] = [];
      const userEmails = new Set();
      projectsRes.projects.forEach((p: any) => {
        p.members.forEach((m: any) => {
          if (!userEmails.has(m.user.email)) {
            userEmails.add(m.user.email);
            allUsers.push(m.user);
          }
        });
      });
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistic UI Update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchData(); // Rollback
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...taskForm,
          status: createColumn,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        }),
      });
      setTasks(prev => [res.task, ...prev]);
      setCreateModalOpen(false);
      setTaskForm({
        title: '',
        description: '',
        projectId: '',
        priority: 'MEDIUM',
        dueDate: '',
        assigneeId: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = async (task: any) => {
    try {
      const fullTask = await apiFetch(`/tasks/${task.id}`);
      setActiveTask(fullTask.task);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTask) return;
    try {
      const res = await apiFetch(`/tasks/${activeTask.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      setActiveTask(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.comment],
      }));
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim() || !activeTask) return;
    try {
      const res = await apiFetch(`/tasks/${activeTask.id}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ title: newSubtask }),
      });
      setActiveTask(prev => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), res.subtask],
      }));
      setNewSubtask('');
      // Update task in parent list
      setTasks(prev =>
        prev.map(t =>
          t.id === activeTask.id
            ? { ...t, subtasks: [...(t.subtasks || []), res.subtask] }
            : t
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    if (!activeTask) return;
    try {
      const res = await apiFetch(`/tasks/${activeTask.id}/subtasks/${subtaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted }),
      });
      setActiveTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map((st: any) => (st.id === subtaskId ? res.subtask : st)),
      }));
      setTasks(prev =>
        prev.map(t =>
          t.id === activeTask.id
            ? {
                ...t,
                subtasks: t.subtasks.map((st: any) => (st.id === subtaskId ? res.subtask : st)),
              }
            : t
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setActiveTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await apiFetch(`/tasks/${taskId}/archive`, { method: 'POST' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setActiveTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateTask = async (taskId: string) => {
    try {
      const res = await apiFetch(`/tasks/${taskId}/duplicate`, { method: 'POST' });
      setTasks(prev => [res.task, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'URGENT': return 'bg-rose-500/20 text-rose-400 border-rose-500/20';
      case 'HIGH': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
      case 'MEDIUM': return 'bg-brand-500/20 text-brand-400 border-brand-500/20';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
    }
  };

  // Filtering
  const filteredTasks = tasks.filter(t => {
    const projMatch = !selectedProject || t.projectId === selectedProject;
    const prioMatch = !selectedPriority || t.priority === selectedPriority;
    return projMatch && prioMatch;
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Board Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="glass-input !rounded-xl text-xs py-2"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="glass-input !rounded-xl text-xs py-2"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <button
          onClick={() => { setCreateColumn('TODO'); setCreateModalOpen(true); }}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold text-xs text-white shadow-md shadow-brand-500/10 transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-h-0 pb-4">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col bg-slate-900/20 border border-white/5 rounded-2xl p-4 min-w-[240px] h-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full border ${col.color.split(' ')[0]} bg-current`} />
                  <h3 className="font-display font-bold text-sm text-slate-300">{col.name}</h3>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colTasks.map(task => {
                  const doneSubtasks = task.subtasks?.filter((st: any) => st.isCompleted).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;
                  
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => handleOpenDetail(task)}
                      className="glass-card p-4 space-y-3 cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] border font-bold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.recurringTask && <span className="text-[9px] text-brand-400 uppercase">♻️ {task.recurringTask}</span>}
                        </div>
                      </div>

                      <h4 className="font-semibold text-xs text-slate-200 line-clamp-2 leading-snug">{task.title}</h4>
                      {task.project && (
                        <p className="text-[9px] text-brand-400 font-semibold truncate">📁 {task.project.name}</p>
                      )}

                      <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[9px] text-slate-500 shrink-0">
                        <div className="flex items-center gap-2">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={10} />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {totalSubtasks > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckSquare size={10} />
                              {doneSubtasks}/{totalSubtasks}
                            </span>
                          )}
                        </div>

                        {task.assignee && (
                          <img
                            src={task.assignee.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${task.assignee.name}`}
                            alt="assignee"
                            className="w-5 h-5 rounded-full border border-white/10"
                            title={task.assignee.name}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => { setCreateColumn(col.id); setCreateModalOpen(true); }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={14} /> Add Card
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Details Side Drawer / Modal */}
      {activeTask && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="absolute inset-0" onClick={() => setActiveTask(null)} />
          <div className="w-full max-w-lg glass-panel h-full flex flex-col p-6 z-10 animate-slide-up relative">
            
            {/* Header */}
            <div className="flex justify-between items-start gap-4 mb-6 shrink-0">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(activeTask.priority)}`}>
                  {activeTask.priority}
                </span>
                <h3 className="font-display font-bold text-lg text-slate-200 mt-2">{activeTask.title}</h3>
                {activeTask.project && (
                  <p className="text-xs text-brand-400 font-semibold mt-1">Project: {activeTask.project.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDuplicateTask(activeTask.id)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  title="Duplicate Task"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleArchiveTask(activeTask.id)}
                  className="p-2 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded-xl transition-all"
                  title="Archive Task"
                >
                  <Archive size={16} />
                </button>
                <button
                  onClick={() => handleDeleteTask(activeTask.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-white/5 rounded-xl transition-all"
                  title="Delete Task"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setActiveTask(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Description */}
              {activeTask.description && (
                <div className="space-y-1 bg-white/5 p-3 rounded-xl">
                  <h4 className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                    <FileText size={12} /> Description
                  </h4>
                  <p className="text-xs text-slate-300 leading-normal">{activeTask.description}</p>
                </div>
              )}

              {/* Subtasks (Checklist) */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                  <ListTodo size={12} /> Subtasks Checklist
                </h4>

                <div className="space-y-2">
                  {activeTask.subtasks?.map((st: any) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2.5 p-2 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer text-xs transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={st.isCompleted}
                        onChange={(e) => toggleSubtask(st.id, e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500"
                      />
                      <span className={st.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}>
                        {st.title}
                      </span>
                    </label>
                  ))}

                  <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Add subtask checklist item..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      className="flex-1 glass-input py-1.5 text-xs"
                    />
                    <button type="submit" className="px-3 rounded-xl bg-brand-600 text-xs font-semibold text-white">
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Discussion Comments
                </h4>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {activeTask.comments?.map((c: any) => (
                    <div key={c.id} className="flex gap-2.5 text-xs bg-white/5 p-2 rounded-xl">
                      <img
                        src={c.user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.user.name}`}
                        alt="comment user"
                        className="w-6 h-6 rounded-full bg-slate-800 border border-white/10"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{c.user.name}</span>
                          <span className="text-[9px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300 mt-1">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 glass-input py-1.5 text-xs"
                  />
                  <button type="submit" className="px-3 rounded-xl bg-brand-600 text-xs font-semibold text-white">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setCreateModalOpen(false)} />
          <div className="glass rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl z-10 animate-slide-up relative">
            <h3 className="font-display font-bold text-lg text-slate-100 mb-4">Add Task Card</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task name"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full glass-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Detail notes..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full glass-input h-20 resize-none py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Project</label>
                  <select
                    value={taskForm.projectId}
                    onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                    className="w-full glass-input text-slate-200"
                  >
                    <option value="">No Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full glass-input text-slate-200"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full glass-input text-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-semibold text-slate-400">Assignee</label>
                  <select
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                    className="w-full glass-input text-slate-200"
                  >
                    <option value="">Assign to Me</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/10"
                >
                  Create Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
