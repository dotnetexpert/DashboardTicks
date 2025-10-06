import React from 'react';
import { DashboardProvider } from './context/DashboardContext';
import Dashboard from './components/Dashboard';

const App: React.FC = () => (
  <DashboardProvider>
    <Dashboard />
  </DashboardProvider>
);

export default App;