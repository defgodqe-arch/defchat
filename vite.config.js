import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repository beneath /defchat/.
  // Other hosts such as Vercel serve from the domain root.
  base: process.env.GITHUB_ACTIONS ? '/defchat/' : '/',
});
