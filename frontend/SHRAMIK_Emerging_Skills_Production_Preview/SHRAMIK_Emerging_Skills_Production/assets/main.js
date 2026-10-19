import React from 'react';
import { createRoot } from 'react-dom/client';
import EmergingSkillsPage from './EmergingSkillsPage.js';
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('SHRAMIK mount root was not found.');
createRoot(rootElement).render(React.createElement(React.StrictMode, null, React.createElement(EmergingSkillsPage)));
