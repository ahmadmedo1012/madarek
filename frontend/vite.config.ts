import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

// Opt-in bundle analysis: `BUNDLE_REPORT=1 npm run build` (or
// `npm run build:report`, which sets the flag) writes
// dist/bundle-report.html. Zero cost when the flag is absent.
const enableBundleReport = !!process.env.BUNDLE_REPORT;

/* R369 C2.3 — the public front-door preload.
 *
 * Diagnosis (Lighthouse 12.8.2 mobile, prod build + gzip mirror, the
 * wave5 protocol): the four Lighthouse-target public routes measured
 * PERF 83-84 with LCP 4.0-4.2 s of which 89 % was RENDER DELAY — the
 * SPA boot chain serializes the lazy page chunks: index.js mounts →
 * router resolves → the page chunk is DISCOVERED → its dep chunks
 * (LegalSheet js+css, useReveal, …) discovered after that, each hop a
 * simulated-1.6Mbps/150ms-RTT round trip. /auth (a shallower chunk
 * graph) measured 96/2.5 s on the same build — proof the deficit is
 * the discovery chain, not the boot itself.
 *
 * The fix: emit <link rel="modulepreload"> (+ rel=preload as=style
 * for the family's lazy CSS) for the whole public family graph at
 * HTML parse time. Zero entry growth, zero boot TBT growth (preload
 * fetches but never executes — unlike eager imports), and the lazy
 * imports resolve from the HTTP cache the moment the router asks.
 * ~10 KB gz on the wire for every visitor — the public pages are the
 * app's front door (auth + features + help + app). */
function publicPagesPreload(): Plugin {
  const FAMILY =
    /^(AuthPage|AuthDoor|authErrors|PublicPages|AppDownloadPage|CapabilityPages|LegalSheet|useReveal|usePageTitle|colleges[.]config)$/;
  return {
    name: 'r369-public-pages-preload',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const jsFiles = new Set<string>();
      const visit = (file: string) => {
        if (jsFiles.has(file)) return;
        const chunk = bundle[file];
        if (!chunk || chunk.type !== 'chunk') return;
        // only preload the family's own chunks and their STATIC import
        // graph — the same set __vitePreload__ would fetch at runtime
        jsFiles.add(file);
        for (const imp of chunk.imports ?? []) visit(imp);
      };
      for (const [file, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && FAMILY.test(chunk.name ?? '')) visit(file);
      }
      if (jsFiles.size === 0) return;
      /* modulepreload ONLY. The family's lazy CSS must NOT ride as
       * head stylesheets (measured: 7 render-blocking sheets pushed
       * FCP 2.1→3.0 s and LCP up on every route — the sheets compete
       * for the 6-connection pool at 150 ms RTT), and NOT as
       * rel=preload as=style either (Chrome's preload-as-style
       * defaults CORS-anonymous vs vite's no-cors runtime injection —
       * "credentials mode does not match", the preloads never hit and
       * the CSS refetched on the simulated critical path). The lazy
       * CSS re-fetch at chunk-execution time is the cheaper evil. */
      const tags = [...[...jsFiles].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`)].join('\n    ');
      // post-enforce: vite's own html plugin has already emitted the
      // final index.html asset — patch it directly
      const idx = bundle['index.html'];
      if (idx && idx.type === 'asset' && typeof idx.source === 'string') {
        idx.source = idx.source.replace(
          '</head>',
          `<!-- R369 C2.3: the public front-door preload (see vite.config.ts) -->\n    ${tags}\n  </head>`,
        );
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    publicPagesPreload(),
    ...(enableBundleReport
      ? [visualizer({ filename: 'dist/bundle-report.html', template: 'sunburst', gzipSize: true })]
      : []),
  ],
  // The `@/` alias mirrors vitest.config.ts so the two runners agree:
  // `@/…` imports resolve identically in tests and in the build (the
  // doc-comments in lib/scrollLock.ts + lib/overlayStack.ts instruct
  // contributors to use it). The `@shared/` alias points at the
  // REPO-ROOT shared/ directory (R320 §C — shared/testAccounts.ts is
  // the consumer entry for the test-account table); it is mirrored in
  // vitest.config.ts and the tsconfig paths — keep the three in sync.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '..', 'shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Dev-only override: VITE_API_TARGET lets a local UI iterate
        // against a remote API (e.g. the production deployment) without
        // booting the backend. Unset → the canonical localhost:4000.
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // r292: the audit protocol (DESIGN.md §9d / the surface-inventory
  // header) captures its baseline against the BUILT app via
  // `vite preview` — never the dev server — but the proxy lived only
  // under `server`, so preview runs could not reach the API at all
  // (role-guarded routes would all render error states). `preview`
  // mirrors the dev proxy exactly; the same VITE_API_TARGET override
  // applies.
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Render free tier = 512 MB RAM: skip the gzip-size pass (it holds every
    // chunk in memory) and keep minify on esbuild — both keep peak RSS low.
    reportCompressedSize: false,
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
          // R341 bundle trim: lucide-react's ~30 shared icons each split
          // into a per-icon chunk (rollup's granular splitting for shared
          // leaf modules), duplicating the 183-char ISC license banner +
          // per-chunk bootstrap overhead ~30×. One vendor chunk carries
          // the license once. Module graph is one-way (app → icons → the
          // internal createElement helper), so the static-list TDZ risk
          // documented above does not apply — verified by the r305 E2E
          // suite after the change.
          lucide: ['lucide-react'],
          // NOTE: the v4 cinematic kit (gsap/@gsap/react/lenis/three/@react-three/fiber)
          // was listed here without ever being added to frontend/package.json —
          // Rollup treats manualChunks entries as entry modules, so their mere
          // presence broke the production build on Render ("Could not resolve
          // entry module gsap"). The «أطلس المعرفة» landing ships its own
          // zero-dependency canvas/motion kit, so these chunks are removed.
          // If a cinematic lib is ever adopted: add it to package.json FIRST,
          // then re-add its chunk entry in the same commit.
        },
      },
    },
  },
});
