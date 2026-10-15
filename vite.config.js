import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Native Capacitor bundles and Electron need relative assets; GitHub Pages needs its repo subpath.
  base: process.env.CAPACITOR_BUILD || process.env.ELECTRON_BUILD
    ? './'
    : process.env.GITHUB_ACTIONS
      ? '/defchat/'
      : '/',
});
