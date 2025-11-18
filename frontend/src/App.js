import React from 'react';
import './App.css';
import AppRouter from './routes/AppRouter';

/**
 * PUBLIC_INTERFACE
 * App - Root component delegating to AppRouter.
 */
function App() {
  return <AppRouter />;
}

export default App;
