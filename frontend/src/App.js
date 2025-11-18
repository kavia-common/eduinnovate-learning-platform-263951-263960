import React from 'react';
import './App.css';
import AppRouter from './routes/AppRouter';
import { ToastProvider } from './features/ui/ToastContext';
import { EnrollmentProvider } from './features/enrollments/EnrollmentContext';

/**
 * PUBLIC_INTERFACE
 * App - Root component delegating to AppRouter, with global providers.
 */
function App() {
  return (
    <ToastProvider>
      <EnrollmentProvider>
        <AppRouter />
      </EnrollmentProvider>
    </ToastProvider>
  );
}

export default App;
