import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Calendar: React.FC = () => {
  const { apiFetch } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Create task state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');

  const fetchCalendarData = async () => {
    try {
      const tasksRes = await apiFetch('/tasks');
      setTasks(tasksRes.tasks.filter((t: any) => t.status !== 'ARCHIVED' && t.dueDate));
      
      const projectsRes = await apiFetch('/projects');
      setProjects(projectsRes.projects);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  // Month grid calculator
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Day of the week for first day (0-6)
    const startDayOfWeek = firstDay.getDay();
    
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const days: Date[] = [];
    
    // Fill leading days of previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthTotalDays - i));
    }
    
    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Fill trailing days of next month to complete 42 cells (6 rows * 7 columns)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  // Week days calculator
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    // Find Sunday of current week
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Date drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const dateIso = targetDate.toISOString();
    
    // Optimistic UI Update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, dueDate: dateIso } : t))
    );

    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ dueDate: dateIso }),
      });
    } catch (err) {
      console.error(err);
      fetchCalendarData(); // Rollback
    }
  };

  const handleDateClick = (date: Date) => {
    // Format to yyyy-MM-dd for HTML input
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    setSelectedDateStr(adjustedDate.toISOString().split('T')[0]);
    setCreateModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          dueDate: new Date(selectedDateStr).toISOString(),
          projectId: taskProjectId || null,
        }),
      });
      setTasks(prev => [...prev, res.task]);
      setCreateModalOpen(false);
      setTaskTitle('');
      setTaskProjectId('');
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBorder = (prio: string) => {
    switch (prio) {
      case 'URGENT': return 'border-l-rose-500 bg-rose-500/10 text-rose-300';
      case 'HIGH': return 'border-l-amber-500 bg-amber-500/10 text-amber-300';
      case 'MEDIUM': return 'border-l-brand-500 bg-brand-500/10 text-brand-300';
      default: return 'border-l-slate-500 bg-slate-800/40 text-slate-400';
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === dateStr);
  };

  const getHeaderLabel = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const startStr = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] select-none">
      
      {/* Calendar Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/5 p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'day' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold transition-all"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white">
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-display font-bold text-sm md:text-base text-slate-200 w-44 text-center">
              {getHeaderLabel()}
            </h3>
            <button onClick={handleNext} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 min-h-0 bg-slate-900/10 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
        {/* Week Days Header Labels (except in single Day View) */}
        {viewMode !== 'day' && (
          <div className="grid grid-cols-7 border-b border-white/5 bg-slate-900/40 text-center shrink-0">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
        )}

        {/* View Grid switcher */}
        <div className="flex-1 overflow-y-auto min-h-0">
          
          {/* Month View Grid */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 grid-rows-6 h-full min-h-[500px]">
              {getMonthDays().map((day, idx) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                return (
                  <div
                    key={idx}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                    onDoubleClick={() => handleDateClick(day)}
                    className={`border-r border-b border-white/5 p-2 flex flex-col justify-between hover:bg-white/[0.02] cursor-pointer transition-colors ${
                      isCurrentMonth ? 'text-slate-200' : 'text-slate-600'
                    } ${isToday(day) ? 'bg-brand-600/5' : ''}`}
                  >
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday(day) ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10 font-bold' : ''
                      }`}>
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Cell Tasks List */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 max-h-24 pr-0.5">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`text-[9px] px-2 py-0.5 rounded border-l-2 truncate leading-tight font-medium ${getPriorityBorder(task.priority)}`}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week View Grid */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 h-full min-h-[400px]">
              {getWeekDays().map((day, idx) => {
                const dayTasks = getTasksForDate(day);
                return (
                  <div
                    key={idx}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day)}
                    onDoubleClick={() => handleDateClick(day)}
                    className={`border-r border-white/5 p-4 flex flex-col hover:bg-white/[0.01] cursor-pointer transition-colors ${
                      isToday(day) ? 'bg-brand-600/5' : ''
                    }`}
                  >
                    <div className="text-center pb-3 border-b border-white/5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{WEEKDAYS[day.getDay()]}</p>
                      <h4 className={`text-base font-extrabold w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 ${
                        isToday(day) ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' : 'text-slate-300'
                      }`}>
                        {day.getDate()}
                      </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 mt-4">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`text-[10px] p-2.5 rounded-xl border-l-2 flex flex-col gap-1.5 shadow-sm leading-normal ${getPriorityBorder(task.priority)}`}
                        >
                          <span className="font-semibold">{task.title}</span>
                          {task.project && <span className="text-[8px] opacity-75">📁 {task.project.name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Day View Grid */}
          {viewMode === 'day' && (
            <div className="p-6 space-y-4 max-w-xl mx-auto">
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <span className="p-2 rounded-xl bg-brand-600/10 text-brand-400">
                  <CalendarIcon size={20} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-200">Daily Agenda</h3>
                  <p className="text-[10px] text-slate-500">Track and reschedule deadlines on a daily timeline</p>
                </div>
              </div>

              <div className="space-y-3">
                {getTasksForDate(currentDate).length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <p className="text-xs text-slate-500">No deadlines scheduled for today</p>
                    <button
                      onClick={() => handleDateClick(currentDate)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                    >
                      <Plus size={14} /> Add Task
                    </button>
                  </div>
                ) : (
                  getTasksForDate(currentDate).map(task => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border-l-4 flex justify-between items-center ${getPriorityBorder(task.priority)}`}
                    >
                      <div>
                        <h4 className="font-semibold text-xs text-slate-200">{task.title}</h4>
                        {task.project && <span className="text-[9px] text-brand-400 mt-1 block">📁 {task.project.name}</span>}
                      </div>
                      {task.dueTime && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[10px] font-semibold">
                          ⏰ {task.dueTime}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setCreateModalOpen(false)} />
          <div className="glass rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl z-10 animate-slide-up relative">
            <h3 className="font-display font-bold text-lg text-slate-100 mb-4">Add Task on {selectedDateStr}</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task name..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">Project</label>
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full glass-input text-slate-200"
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
