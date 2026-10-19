import React from 'react';
import { createRoot } from 'react-dom/client';
import SHRAMIKDashboard from './SHRAMIKDashboard';
import './shramik-dashboard.css';
import './module-utilities.css';
import './module-route-placeholder.css';
import './data-sources-scoped.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SHRAMIKDashboard />
  </React.StrictMode>,
);
