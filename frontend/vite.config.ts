import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    // 350 KB warning floor — every page chunk should sit comfortably under this.
    chunkSizeWarningLimit: 350,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Framework split — React + router on one chunk
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/scheduler/')
          ) return 'vendor-react';

          if (id.includes('/@tanstack/react-query')) return 'vendor-query';

          // Charts are heavy — isolate them so only chart-using pages pay.
          if (id.includes('/chart.js') || id.includes('/react-chartjs-2')) return 'vendor-charts';

          // PDF viewer is the single biggest dep — keep it separate so
          // only the document viewer route ever has to download it.
          if (id.includes('/pdfjs-dist') || id.includes('/react-pdf')) return 'vendor-pdf';

          // Icons — Lucide ships ~1500 icons. Tree-shaking handles the
          // unused ones, but isolating it stops a single icon import from
          // dragging the whole library into the page chunk.
          if (id.includes('/lucide-react')) return 'vendor-icons';

          // Everything else from node_modules → general vendor bundle.
          return 'vendor';
        },
      },
    },
  },
});
