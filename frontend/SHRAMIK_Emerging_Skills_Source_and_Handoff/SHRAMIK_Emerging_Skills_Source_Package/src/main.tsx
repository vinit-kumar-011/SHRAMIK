import React from 'react';
import ReactDOM from 'react-dom/client';
import EmergingSkillsPage, { demoEmergingSkillsDataAdapter } from '../shramik_emerging_skills';
import './index.css';

// Preview host only: the main SHRAMIK application should inject its canonical API adapter.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><EmergingSkillsPage dataAdapter={demoEmergingSkillsDataAdapter} /></React.StrictMode>,
);
