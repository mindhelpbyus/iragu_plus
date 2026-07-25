import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { AccessToken } from 'livekit-server-sdk';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // amazon-cognito-identity-js (via its `buffer` dep) references Node's `global`,
    // which doesn't exist in the browser. Map it to globalThis.
    define: {
      global: 'globalThis',
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'livekit-token-mock',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/video/token')) {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const appointmentId = url.searchParams.get('appointmentId') || 'test-room';
              const participantName = url.searchParams.get('name') || 'User';
              const role = url.searchParams.get('role') || 'therapist';

              const apiKey = env.LIVEKIT_API_KEY;
              const apiSecret = env.LIVEKIT_API_SECRET;

              if (!apiKey || !apiSecret) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'LiveKit credentials missing in .env.local' }));
                return;
              }

              try {
                const roomName = `session-${appointmentId}`;
                const at = new AccessToken(apiKey, apiSecret, {
                  identity: participantName,
                  ttl: '2h',
                });
                at.addGrant({
                  roomJoin: true,
                  room: roomName,
                  canPublish: true,
                  canSubscribe: true,
                  canPublishData: true,
                  roomAdmin: role === 'therapist',
                  roomRecord: role === 'therapist',
                });

                const token = await at.toJwt();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ token, room: roomName }));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      // Split big vendors into cacheable chunks so one heavy feature doesn't bloat
      // a shared bundle and deps cache across deploys.
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            radix: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover',
                    '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
            charts: ['recharts'],
            video: ['livekit-client', '@livekit/components-react'],
            motion: ['framer-motion'],
            forms: ['react-hook-form', 'react-phone-number-input'],
          },
        },
      },
    },
    server: {
      // 5173 is Vite's own default and is already CORS-allow-listed on the dev
      // API Gateway (backend-initial/infrastructure/config/environment.ts) — no
      // conflict with Ataraxia, which is pinned to 3000.
      port: 5173,
      strictPort: true,
      open: true,
    },
  };
});
