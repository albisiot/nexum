import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: l'app funziona sia in locale sia su GitHub Pages (albisiot.github.io/nexum/).
  base: './',
  server: { port: 5173 },
});
