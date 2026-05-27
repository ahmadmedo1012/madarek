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
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['chart.js', 'react-chartjs-2'],
          'pages-student': [
            './src/pages/student/DashboardPage',
            './src/pages/student/CoursesPage',
            './src/pages/student/LabsPage',
            './src/pages/student/AiAssistantPage',
            './src/pages/student/MorePages',
          ],
          'pages-teacher': [
            './src/pages/teacher/TeacherPages',
            './src/pages/teacher/TeacherDashboardPage',
            './src/pages/teacher/TeacherIntelligencePage',
          ],
          'pages-admin': [
            './src/pages/admin/AdminPages',
            './src/pages/admin/AdminGovernancePages',
          ],
          'pages-owner': [
            './src/pages/owner/OwnerPages',
          ],
          'pages-quality': [
            './src/pages/quality/QualityPages',
          ],
        },
      },
    },
  },
});
