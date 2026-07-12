import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Camera, Check, ShieldAlert } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [avatarSeed, setAvatarSeed] = useState(() => {
    if (user?.avatarUrl) {
      const match = user.avatarUrl.match(/seed=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : 'Jane';
    }
    return 'Jane';
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`;
    const res = await updateUser(name, avatarUrl);
    setLoading(false);

    if (res.success) {
      setSuccess('Profile updated successfully');
    } else {
      setError(res.error || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const res = await updateUser(name, user?.avatarUrl || null, password);
    setLoading(false);

    if (res.success) {
      setSuccess('Password updated successfully');
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to update password');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Messages */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Profile Form */}
      <div className="glass-card p-6">
        <h2 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
          <User size={20} className="text-brand-400" />
          Profile Configuration
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Avatar selector */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`}
                alt="avatar preview"
                className="w-20 h-20 rounded-full border-2 border-brand-500 bg-slate-800"
              />
              <span className="absolute bottom-0 right-0 p-1.5 bg-brand-600 rounded-full border border-slate-950 text-white cursor-pointer hover:bg-brand-500 transition-colors">
                <Camera size={12} />
              </span>
            </div>
            <div className="space-y-1 flex-1 w-full">
              <label className="text-xs font-medium text-slate-400">Avatar Style Seed</label>
              <input
                type="text"
                value={avatarSeed}
                onChange={(e) => setAvatarSeed(e.target.value)}
                placeholder="Type anything to change avatar design..."
                className="w-full glass-input"
              />
              <p className="text-[10px] text-slate-500">Avatar generated dynamically via DiceBear API using the seed text above.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full glass-input opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Security Form */}
      <div className="glass-card p-6">
        <h2 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
          <Lock size={20} className="text-brand-400" />
          Update Password
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full glass-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/10"
          >
            {loading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
