import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (response: any) => {
    setError('');
    setLoading(true);
    const res = await loginWithGoogle(response.credential);
    setLoading(false);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Google login failed');
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    try {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSuccess,
      });

      // @ts-ignore
      google.accounts.id.renderButton(
        document.getElementById('googleSignInBtn'),
        { theme: 'outline', size: 'large', width: '380', text: 'continue_with' }
      );
    } catch (err) {
      console.warn('Google Sign-In failed to load', err);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 text-white font-display font-bold text-2xl shadow-xl shadow-brand-500/10 mb-4">
            T
          </div>
          <h2 className="font-display font-extrabold text-3xl text-slate-100">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-2">Log in to manage your tasks with intelligence</p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          {/* Google Sign In Button Container */}
          {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="space-y-4 mb-4">
              <div id="googleSignInBtn" className="flex justify-center" />
              <div className="flex items-center justify-center gap-2">
                <span className="h-[1px] bg-white/10 flex-1" />
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Or standard log in</span>
                <span className="h-[1px] bg-white/10 flex-1" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/10 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
              Create an account
            </Link>
          </p>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <span className="text-[10px] text-slate-600">Demo Account: test@taskflow.ai / password123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await register(email, name, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 text-white font-display font-bold text-2xl shadow-xl shadow-brand-500/10 mb-4">
            T
          </div>
          <h2 className="font-display font-extrabold text-3xl text-slate-100">Create Account</h2>
          <p className="text-xs text-slate-500 mt-2">Get started with your smart personal workspace</p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl relative">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Full Name</label>
              <div className="relative flex items-center">
                <User className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/10 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Get Started'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
