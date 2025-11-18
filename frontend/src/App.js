import React from 'react';
import './App.css';
import AppRouter from './routes/AppRouter';
import { ToastProvider } from './features/ui/ToastContext';
import { EnrollmentProvider } from './features/enrollments/EnrollmentContext';
import { AuthProvider } from './features/auth/AuthContext';

/**
 * PUBLIC_INTERFACE
 * App - Root component delegating to AppRouter, with global providers.
 */
import { useEffect } from 'react';
import supabase from './features/auth/supabaseClient';
import { useToast } from './features/ui/ToastContext';

function EnvGuard({ children }) {
  const { showToast } = useToast();
  useEffect(() => {
    if (!supabase) {
      try {
        showToast(
          "Supabase not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.",
          { tone: "warning", duration: 5000 }
        );
      } catch { /* ignore */ }
    }
  }, [showToast]);
  return children;
}

function App() {
  return (
    <ToastProvider>
      <EnvGuard>
        <AuthProvider>
          <EnrollmentProvider>
            <AppRouter />
          </EnrollmentProvider>
        </AuthProvider>
      </EnvGuard>
    </ToastProvider>
  );
}

export default App;
