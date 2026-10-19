import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths support static hosting under a project subpath.
export default defineConfig({ base: './', plugins: [react()] });
