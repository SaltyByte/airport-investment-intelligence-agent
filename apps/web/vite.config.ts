import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Read only SERVER_* from the repo-root .env (and process env) so the proxy follows the server's port.
  const rootDir = fileURLToPath(new URL('../..', import.meta.url));
  const serverPort = loadEnv(mode, rootDir, 'SERVER_').SERVER_PORT ?? '4100';
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': `http://localhost:${serverPort}` },
    },
  };
});
