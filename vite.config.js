import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: Unterpfad, unter dem die App ausgeliefert wird.
// GitHub Pages: '/jagd-tracker/'. Bei eigener (Sub-)Domain später auf '/' umstellen.
export default defineConfig({
  base: '/jagd-tracker/',
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    port: 3000,
  },
});
