import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { Dashboard } from './pages/Dashboard';
import { Kanban } from './pages/Kanban';
import { Calendar } from './pages/Calendar';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { AiPanel } from './components/AiPanel';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode; onOpenAi: () => void }> = ({ children, onOpenAi }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-brand-500" />
          <p className="text-xs text-slate-500 font-semibold font-display">Initializing Workspace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout onOpenAi={onOpenAi}>{children}</Layout>;
};

const AppContent: React.FC = () => {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected workspace routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute onOpenAi={() => setAiOpen(true)}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kanban"
          element={
            <ProtectedRoute onOpenAi={() => setAiOpen(true)}>
              <Kanban />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute onOpenAi={() => setAiOpen(true)}>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute onOpenAi={() => setAiOpen(true)}>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute onOpenAi={() => setAiOpen(true)}>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating AI Panel Drawer */}
      <AiPanel isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
