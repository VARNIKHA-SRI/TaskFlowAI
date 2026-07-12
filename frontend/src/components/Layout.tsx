import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Trello,
  Calendar as CalendarIcon,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Sun,
  Moon,
  Sparkles,
  Search,
  Menu,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onOpenAi: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenAi }) => {
  const { user, logout, apiFetch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 30 seconds
      const timer = setInterval(fetchNotifications, 30000);
      return () => clearInterval(timer);
    }
  }, [user]);

  // Global search handler
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const data = await apiFetch(`/tasks?status=`);
        // Local filter for mock global search
        const filtered = data.tasks.filter((t: any) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.project && t.project.name.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 5);
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
      }
    };
    const delayDebounce = setTimeout(performSearch, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleNotificationRead = async (id: string) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Kanban Board', path: '/kanban', icon: Trello },
    { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getPageTitle = () => {
    const current = menuItems.find(item => item.path === location.pathname);
    return current ? current.name : 'TaskFlow AI';
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Desktop */}
      <aside className={`w-64 glass fixed inset-y-0 left-0 z-30 transition-transform duration-300 transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col justify-between p-6`}>
        <div>
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white font-display font-bold text-xl shadow-lg shadow-brand-500/20">
                T
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight bg-gradient-to-r from-brand-500 to-indigo-400 bg-clip-text text-transparent">
                TaskFlow AI
              </span>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600/30 to-indigo-500/20 border border-brand-500/20 text-brand-400 shadow-md shadow-brand-500/5'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`
                }
              >
                <item.icon size={18} />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Card & Action Footer */}
        <div className="space-y-4">
          <button
            onClick={onOpenAi}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 font-semibold text-sm shadow-lg shadow-brand-500/20 text-white transition-all group"
          >
            <Sparkles size={16} className="group-hover:animate-pulse" />
            Ask TaskFlow AI
          </button>

          {user && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
                  alt="avatar"
                  className="w-9 h-9 rounded-full bg-slate-800"
                />
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-xs text-slate-200 truncate">{user.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button onClick={logout} className="text-slate-400 hover:text-rose-400 transition-colors p-1" title="Log Out">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 glass flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-400 hover:text-slate-200" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="font-display font-bold text-xl md:text-2xl text-slate-100 light:text-slate-900">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Search Box */}
            <div className="relative hidden sm:block">
              <div className="flex items-center">
                <Search className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Quick search task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  className="w-64 pl-9 pr-4 py-2 text-xs rounded-full bg-slate-900/60 border border-white/10 focus:outline-none focus:border-brand-500 text-slate-100 placeholder-slate-500 transition-all focus:w-80"
                />
              </div>

              {searchFocused && searchResults.length > 0 && (
                <div className="absolute right-0 top-12 w-80 glass rounded-xl p-3 shadow-2xl space-y-2 border border-white/10 z-50 animate-fade-in">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 px-2">Suggestions</p>
                  {searchResults.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate('/kanban')}
                      className="p-2 rounded-lg hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs"
                    >
                      <span className="font-medium text-slate-200 truncate pr-2">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${
                        task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-500/20 text-brand-400'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-white/5 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-white/5 transition-colors relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 glass rounded-2xl p-4 shadow-2xl border border-white/10 z-50 animate-fade-in flex flex-col max-h-[400px]">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] font-semibold text-brand-400 hover:text-brand-300">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-6">No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl text-xs transition-all border flex gap-3 items-start ${
                            n.isRead
                              ? 'bg-transparent border-transparent text-slate-500'
                              : 'bg-brand-600/10 border-brand-500/10 text-slate-200'
                          }`}
                        >
                          {n.type === 'DUE_TODAY' || n.type === 'OVERDUE' ? (
                            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <p className="leading-tight">{n.message}</p>
                            <span className="text-[9px] text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile image redirect */}
            {user && (
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
                alt="profile"
                onClick={() => navigate('/settings')}
                className="w-8 h-8 rounded-full border border-white/10 cursor-pointer bg-slate-800 hover:border-brand-500 transition-colors"
              />
            )}
          </div>
        </header>

        {/* Content Section */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-slide-up">
          {children}
        </main>
      </div>
    </div>
  );
};
