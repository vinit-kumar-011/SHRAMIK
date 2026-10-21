import React from 'react';
import { createRoot } from 'react-dom/client';
import SHRAMIKDashboard from './SHRAMIKDashboard';
import './shramik-dashboard.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SHRAMIKDashboard />
  </React.StrictMode>,
);
