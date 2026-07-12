import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Award,
  ArrowRight,
  TrendingUp,
  Activity,
  Plus
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<any>(null);
  const [criticalTasks, setCriticalTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const analyticData = await apiFetch('/analytics');
      setAnalytics(analyticData);

      const tasksData = await apiFetch('/tasks');
      // Critical tasks are not completed, and are HIGH/URGENT priority
      const critical = tasksData.tasks
        .filter((t: any) => t.status !== 'COMPLETED' && (t.priority === 'HIGH' || t.priority === 'URGENT'))
        .slice(0, 4);
      setCriticalTasks(critical);

      // Fetch global activities for active projects
      if (analyticData.projectDistribution.length > 0) {
        const projData = await apiFetch('/projects');
        // Collect activities across projects
        const allActs: any[] = [];
        for (const p of projData.projects.slice(0, 2)) {
          const actRes = await apiFetch(`/projects/${p.id}/activities`);
          allActs.push(...actRes.activities);
        }
        setActivities(allActs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-800 rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { summary, weeklyProductivity, projectDistribution } = analytics;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-slate-100 light:text-slate-900 flex items-center gap-2">
            {getGreeting()}, {user?.name || 'User'}!
          </h2>
          <p className="text-xs text-slate-500 mt-1">Here is a quick snapshot of your productivity status for today.</p>
        </div>
        <button
          onClick={() => navigate('/kanban')}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold text-xs text-white shadow-md shadow-brand-500/10 transition-colors"
        >
          <Plus size={16} />
          Create New Task
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productivity Score */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Productivity Score</span>
            <h3 className="font-display font-bold text-2xl text-slate-100">{summary.productivityScore}/100</h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-500" /> Tracked weekly progress
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Award size={24} />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Tasks Completed</span>
            <h3 className="font-display font-bold text-2xl text-emerald-400">{summary.completed}</h3>
            <p className="text-[10px] text-slate-400">Out of {summary.total} total tasks</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Active Pending</span>
            <h3 className="font-display font-bold text-2xl text-brand-400">{summary.pending}</h3>
            <p className="text-[10px] text-slate-400">Waiting in backlog/todo</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Clock size={24} />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Overdue Tasks</span>
            <h3 className="font-display font-bold text-2xl text-rose-500">{summary.overdue}</h3>
            <p className="text-[10px] text-slate-400">Past due date limits</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts & Projects Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Productivity Chart */}
        <div className="glass-card p-6 lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-base text-slate-200">Weekly Task Progress</h3>
              <p className="text-[10px] text-slate-500">Completions recorded over the last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-brand-400">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Completed
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProductivity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" strokeWidth={0.5} tickLine={false} />
                <YAxis stroke="#475569" strokeWidth={0.5} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f1f5f9' }}
                  labelClassName="font-semibold text-slate-300"
                />
                <Area type="monotone" dataKey="completed" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Streak & Productivity Summary */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-display font-bold text-base text-slate-200">Streak Status</h3>
            <p className="text-[10px] text-slate-500">Maintain completion streaks daily</p>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1 py-4">
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-slate-800 bg-slate-900/60 shadow-inner">
              <Flame size={48} className="text-orange-500 animate-bounce" />
              {summary.currentStreak > 0 && (
                <span className="absolute bottom-1 right-2 px-2 py-0.5 bg-orange-600 rounded-full text-white text-[10px] font-bold">
                  Active
                </span>
              )}
            </div>
            <div className="text-center mt-4">
              <h4 className="font-display font-bold text-lg text-slate-200">{summary.currentStreak} Days Current</h4>
              <p className="text-[10px] text-slate-500">Your longest recorded streak is {summary.longestStreak} days.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/10 text-[11px] text-orange-300 flex items-start gap-2.5">
            <Flame size={16} className="shrink-0 mt-0.5" />
            <span>Complete at least 1 task daily to keep the fire burning. Stay productive!</span>
          </div>
        </div>
      </div>

      {/* Projects & Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects List */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-base text-slate-200">Active Projects</h3>
            <button onClick={() => navigate('/kanban')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {projectDistribution.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">No projects created yet</p>
            ) : (
              projectDistribution.map((p: any) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span className="truncate pr-2">{p.name}</span>
                    <span>{Math.round(p.progress)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.color === 'rose' ? 'bg-rose-500' :
                          p.color === 'emerald' ? 'bg-emerald-500' :
                          p.color === 'amber' ? 'bg-amber-500' :
                          p.color === 'violet' ? 'bg-violet-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{p.taskCount} tasks</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Critical Tasks */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-base text-slate-200">Critical Alerts</h3>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold">Urgent</span>
          </div>

          <div className="space-y-3">
            {criticalTasks.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">No immediate urgent tasks</p>
            ) : (
              criticalTasks.map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => navigate('/kanban')}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-500/30 cursor-pointer transition-all flex justify-between items-center"
                >
                  <div className="overflow-hidden pr-2">
                    <h4 className="font-semibold text-xs text-slate-300 truncate">{t.title}</h4>
                    {t.dueDate && (
                      <span className="text-[9px] text-slate-500">
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                    t.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Logs */}
        <div className="glass-card p-6 space-y-5">
          <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-2">
            <Activity size={18} className="text-brand-400" />
            Activity Timeline
          </h3>

          <div className="space-y-4 overflow-y-auto max-h-56 pr-1">
            {activities.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">No recent project activity</p>
            ) : (
              activities.map((a: any) => (
                <div key={a.id} className="flex gap-3 text-xs leading-normal">
                  <img
                    src={a.user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${a.user.name}`}
                    alt="user"
                    className="w-6 h-6 rounded-full bg-slate-800 shrink-0 border border-white/10"
                  />
                  <div className="space-y-0.5">
                    <p className="text-slate-300">
                      <span className="font-semibold text-slate-200">{a.user.name}</span> {a.description}
                    </p>
                    <span className="text-[9px] text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
