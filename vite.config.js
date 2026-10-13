import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages needs a repository subpath; packaged Electron builds need relative assets.
  base: process.env.GITHUB_ACTIONS ? '/defchat/' : '/',
});
