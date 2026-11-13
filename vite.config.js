import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',            // Pages では '/<repo>/'。ローカルとテストは '/'
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1500 },
  server: { host: true, port: 5173 },
  preview: { port: 4173 },
});
