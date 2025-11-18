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
function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <EnrollmentProvider>
          <AppRouter />
        </EnrollmentProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
