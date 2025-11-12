import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'https://your-server-url.com'),
  },
  resolve: {
    dedupe: ['yjs', 'y-websocket', 'lib0'],
  },
  build: {
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id) => /node_modules\/(yjs|y-websocket|lib0)\//.test(id),
      },
    },
  },
})
