import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Flame, Clock, Award, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

export const Analytics: React.FC = () => {
  const { apiFetch } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/analytics');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-800 rounded-2xl md:col-span-2" />
          <div className="h-44 bg-slate-800 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const { summary, priorities, weeklyProductivity, timeSpent, projectDistribution, heatmap } = data;

  // Custom Heatmap Grid Generator
  const renderHeatmap = () => {
    const today = new Date();
    const columns: any[][] = [];
    let currentWeek: any[] = [];
    
    // We want 53 columns (weeks), ending today.
    // Sunday is day 0, Saturday is day 6.
    // Find the date 371 days ago (53 weeks * 7 days) and align it to Sunday.
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek); // align to Sunday

    let tempDate = new Date(startDate);
    
    while (tempDate <= today || columns.length < 52) {
      const dateStr = tempDate.toISOString().split('T')[0];
      const count = heatmap[dateStr] || 0;
      
      currentWeek.push({
        date: new Date(tempDate),
        dateStr,
        count,
      });

      if (currentWeek.length === 7) {
        columns.push(currentWeek);
        currentWeek = [];
      }
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      // pad week
      while (currentWeek.length < 7) {
        currentWeek.push({ date: null, dateStr: '', count: 0 });
      }
      columns.push(currentWeek);
    }

    const getHeatmapColor = (count: number) => {
      if (count === 0) return 'bg-slate-900 border-white/5';
      if (count === 1) return 'bg-brand-500/30 border-brand-500/20';
      if (count === 2) return 'bg-brand-500/60 border-brand-500/40';
      return 'bg-brand-500 border-brand-400';
    };

    return (
      <div className="overflow-x-auto select-none pt-2 scrollbar-thin">
        <div className="flex gap-[3px] min-w-[700px] justify-between pb-2">
          {columns.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-[3px]">
              {week.map((day, rowIdx) => {
                if (!day.date) return <div key={rowIdx} className="w-[11px] h-[11px] bg-transparent" />;
                return (
                  <div
                    key={rowIdx}
                    className={`w-[11px] h-[11px] rounded-[2px] border transition-colors ${getHeatmapColor(day.count)}`}
                    title={`${day.count} tasks completed on ${day.date.toLocaleDateString()}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 text-[9px] text-slate-500 pt-2 border-t border-white/5">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-900 border border-white/5" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-brand-500/30 border border-brand-500/20" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-brand-500/60 border border-brand-500/40" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-brand-500 border border-brand-400" />
          <span>More</span>
        </div>
      </div>
    );
  };

  // Pie chart format
  const projectChartData = projectDistribution
    .filter((p: any) => p.taskCount > 0)
    .map((p: any) => ({
      name: p.name,
      value: p.taskCount,
    }));

  const priorityChartData = [
    { name: 'Low', count: priorities.LOW },
    { name: 'Medium', count: priorities.MEDIUM },
    { name: 'High', count: priorities.HIGH },
    { name: 'Urgent', count: priorities.URGENT },
  ];

  return (
    <div className="space-y-8">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Productivity score gauge */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Productivity Score</span>
            <h3 className="font-display font-bold text-2xl text-slate-200">{summary.productivityScore}/100</h3>
            <p className="text-[9px] text-slate-500">Calculated on streaks & completions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Award size={22} />
          </div>
        </div>

        {/* Streak status */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Active Streak</span>
            <h3 className="font-display font-bold text-2xl text-orange-400">{summary.currentStreak} Days</h3>
            <p className="text-[9px] text-slate-500">Longest: {summary.longestStreak} days</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
            <Flame size={22} />
          </div>
        </div>

        {/* Completed tasks */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Completed Ratio</span>
            <h3 className="font-display font-bold text-2xl text-emerald-400">
              {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
            </h3>
            <p className="text-[9px] text-slate-500">{summary.completed} of {summary.total} tasks done</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Award size={22} />
          </div>
        </div>

        {/* Time spent */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Time Tracked</span>
            <h3 className="font-display font-bold text-2xl text-slate-200">
              {timeSpent.actual.toFixed(1)} hrs
            </h3>
            <p className="text-[9px] text-slate-500">Est: {timeSpent.estimated.toFixed(1)} hrs</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* GitHub-style Contribution Heatmap */}
      <div className="glass-card p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-400" />
            Productivity Heatmap
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Tasks completed daily over the past calendar year</p>
        </div>
        
        {renderHeatmap()}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Project distribution */}
        <div className="glass-card p-6 space-y-6">
          <div>
            <h3 className="font-display font-bold text-base text-slate-200">Project Distribution</h3>
            <p className="text-[10px] text-slate-500">Task distribution ratio by project</p>
          </div>

          <div className="h-60 w-full flex items-center justify-center text-xs">
            {projectChartData.length === 0 ? (
              <p className="text-slate-500">No active tasks in projects</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {projectChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-[10px]">
            {projectChartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="glass-card p-6 space-y-6">
          <div>
            <h3 className="font-display font-bold text-base text-slate-200">Priority Allocation</h3>
            <p className="text-[10px] text-slate-500">Total task quantities segmented by priority</p>
          </div>

          <div className="h-60 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" strokeWidth={0.5} tickLine={false} />
                <YAxis stroke="#475569" strokeWidth={0.5} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f1f5f9' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {priorityChartData.map((entry, index) => {
                    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
                    return <Cell key={`cell-${index}`} fill={colors[index]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
