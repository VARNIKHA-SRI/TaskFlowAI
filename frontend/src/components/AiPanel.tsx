import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ChevronRight,
  ListChecks,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileText,
  Activity,
  Send,
  Loader2,
  ListTodo
} from 'lucide-react';

interface AiPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiPanel: React.FC<AiPanelProps> = ({ isOpen, onClose }) => {
  const { apiFetch } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'breakdown' | 'prioritize' | 'schedule' | 'summary'>('breakdown');
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Selection states
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // Results
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [appliedMessage, setAppliedMessage] = useState('');

  const loadData = async () => {
    try {
      const tasksRes = await apiFetch('/tasks');
      setTasks(tasksRes.tasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'ARCHIVED'));
      
      const projectsRes = await apiFetch('/projects');
      setProjects(projectsRes.projects);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setResult(null);
      setAppliedMessage('');
    }
  }, [isOpen]);

  const handleBreakdown = async () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;
    setLoading(true);
    setResult(null);
    setAppliedMessage('');
    try {
      const data = await apiFetch('/ai/breakdown', {
        method: 'POST',
        body: JSON.stringify({ title: task.title, description: task.description }),
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubtasks = async () => {
    if (!selectedTaskId || !result || !result.subtasks) return;
    try {
      setLoading(true);
      for (const title of result.subtasks) {
        await apiFetch(`/tasks/${selectedTaskId}/subtasks`, {
          method: 'POST',
          body: JSON.stringify({ title }),
        });
      }
      setAppliedMessage('Checklist items successfully applied to task!');
      setResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrioritize = async () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;
    setLoading(true);
    setResult(null);
    setAppliedMessage('');
    try {
      const data = await apiFetch('/ai/prioritize', {
        method: 'POST',
        body: JSON.stringify({ title: task.title, description: task.description, dueDate: task.dueDate }),
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPriority = async () => {
    if (!selectedTaskId || !result || !result.priority) return;
    try {
      setLoading(true);
      await apiFetch(`/tasks/${selectedTaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: result.priority }),
      });
      setAppliedMessage(`Task priority updated to ${result.priority}!`);
      setResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    setLoading(true);
    setResult(null);
    setAppliedMessage('');
    try {
      const data = await apiFetch('/ai/schedule', { method: 'POST' });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummary = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setResult(null);
    setAppliedMessage('');
    try {
      const data = await apiFetch(`/ai/project/${selectedProjectId}/summary`);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="w-full max-w-md glass-panel h-full flex flex-col p-6 z-10 animate-slide-up relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-brand-400 animate-pulse" />
            <h3 className="font-display font-extrabold text-lg text-slate-100">TaskFlow AI Assistant</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-semibold">
            Close
          </button>
        </div>

        {/* Action Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5 text-center mb-6 shrink-0 text-[10px] font-semibold">
          <button
            onClick={() => { setActiveTab('breakdown'); setResult(null); setAppliedMessage(''); }}
            className={`py-2 rounded-lg transition-all ${activeTab === 'breakdown' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          >
            Breakdown
          </button>
          <button
            onClick={() => { setActiveTab('prioritize'); setResult(null); setAppliedMessage(''); }}
            className={`py-2 rounded-lg transition-all ${activeTab === 'prioritize' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          >
            Prioritize
          </button>
          <button
            onClick={() => { setActiveTab('schedule'); setResult(null); setAppliedMessage(''); }}
            className={`py-2 rounded-lg transition-all ${activeTab === 'schedule' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          >
            Schedule
          </button>
          <button
            onClick={() => { setActiveTab('summary'); setResult(null); setAppliedMessage(''); }}
            className={`py-2 rounded-lg transition-all ${activeTab === 'summary' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          >
            Summary
          </button>
        </div>

        {/* Applied banner */}
        {appliedMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 size={16} />
            {appliedMessage}
          </div>
        )}

        {/* Scrollable Work Area */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Tab 1: Breakdown */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-500">Select Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full glass-input text-slate-200"
                >
                  <option value="">Choose task to break down...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleBreakdown}
                disabled={loading || !selectedTaskId}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />}
                Generate Subtasks Checklist
              </button>

              {result && (
                <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4 animate-fade-in">
                  <h4 className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                    <ListTodo size={14} className="text-brand-400" /> Proposed Subtasks
                  </h4>
                  <ul className="space-y-2">
                    {result.subtasks.map((st: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs text-slate-300">
                        <ChevronRight size={14} className="text-brand-400 shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleApplySubtasks}
                    className="w-full py-2.5 rounded-xl border border-brand-500/30 text-brand-400 hover:bg-brand-500/5 transition-all text-xs font-semibold"
                  >
                    Apply Checklist to Task
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Prioritize */}
          {activeTab === 'prioritize' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-500">Select Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full glass-input text-slate-200"
                >
                  <option value="">Choose task to prioritize...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrioritize}
                disabled={loading || !selectedTaskId}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Analyze Priority Level
              </button>

              {result && (
                <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-xs text-slate-300">Recommended Priority</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      result.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-400' :
                      result.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-500/20 text-brand-400'
                    }`}>
                      {result.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-3 rounded-xl">
                    💡 {result.reasoning}
                  </p>
                  <button
                    onClick={handleApplyPriority}
                    className="w-full py-2.5 rounded-xl border border-brand-500/30 text-brand-400 hover:bg-brand-500/5 transition-all text-xs font-semibold"
                  >
                    Apply Priority to Task
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-normal">
                Optimize your active agenda. TaskFlow AI will sequence your active tasks due today into a structured daily work schedule.
              </p>

              <button
                onClick={handleSchedule}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                Optimize Today's Schedule
              </button>

              {result && (
                <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4 animate-fade-in">
                  <h4 className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                    <Activity size={14} className="text-brand-400 animate-pulse" /> Recommended Daily Flow
                  </h4>
                  {result.schedule.length === 0 ? (
                    <p className="text-xs text-slate-500">No active tasks found to schedule today.</p>
                  ) : (
                    <div className="space-y-3">
                      {result.schedule.map((item: any, idx: number) => {
                        const relatedTask = tasks.find(t => t.id === item.taskId);
                        return (
                          <div key={idx} className="p-3 bg-slate-900/60 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-brand-400">{item.timeSlot}</span>
                            </div>
                            <h5 className="font-semibold text-xs text-slate-200 truncate">{relatedTask?.title || 'Unknown Task'}</h5>
                            <p className="text-[10px] text-slate-500 italic">{item.note}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-slate-500">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full glass-input text-slate-200"
                >
                  <option value="">Choose project to summarize...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleTransitionSummary}
                disabled={loading || !selectedProjectId}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                Generate Progress Summary
              </button>

              {result && (
                <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-4 animate-fade-in text-xs">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-slate-300">Project Health</h4>
                    <span className="font-bold text-brand-400">{result.completionPercent}% Done</span>
                  </div>

                  <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl font-medium">
                    {result.summary}
                  </p>

                  {result.blockers.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-rose-500 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> Bottlenecks & Warnings
                      </span>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
                        {result.blockers.map((b: string, idx: number) => <li key={idx}>{b}</li>)}
                      </ul>
                    </div>
                  )}

                  {result.nextSteps.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Recommended Next Steps
                      </span>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
                        {result.nextSteps.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Helper trigger to wrap logic
  function handleTransitionSummary() {
    handleSummary();
  }
};
