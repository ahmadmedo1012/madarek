import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// Opt-in bundle analysis: `BUNDLE_REPORT=1 npm run build` (or
// `npm run build:report`, which sets the flag) writes
// dist/bundle-report.html. Zero cost when the flag is absent.
const enableBundleReport = !!process.env.BUNDLE_REPORT;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(enableBundleReport
      ? [visualizer({ filename: 'dist/bundle-report.html', template: 'sunburst', gzipSize: true })]
      : []),
  ],
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
    // No production sourcemaps: the repo has no error-tracking consumer
    // (no sentry/bugsnag), so public .map files only added ~5.9 MB to the
    // deploy and exposed the full client source. Local debugging can
    // flip this to true (or 'hidden' for unreferenced maps).
    sourcemap: false,
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Static manualChunks — the previous function form was over-eager:
        // grouping every node_module into named chunks (vendor / vendor-icons
        // / vendor-charts) ended up putting modules with mutual dependencies
        // into different output chunks, producing a TDZ error at runtime
        // ("Cannot access 'de' before initialization"). The static list only
        // pins the explicit packages we list; everything else stays in the
        // page chunks where Rollup can resolve init order on its own.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
});
