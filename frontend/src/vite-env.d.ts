// Vite-injected env vars
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
  // R320 §C — the test-account login panel's visibility gate:
  // absent = SHOW (default on while the project is in development);
  // '0' hides the panel everywhere (build with VITE_SHOW_TEST_ACCOUNTS=0).
  // R322 A8-prod: '1' forces the panel OPEN by default even in a
  // production build (demo presentations); production builds otherwise
  // show the collapsed chip — open-by-default is a DEV behaviour.
  readonly VITE_SHOW_TEST_ACCOUNTS?: string;
  // r324 X15 — the HELP page's pilot-credentials gate: the FAQ copy
  // that names @test.ly / the shared password renders ONLY when this is
  // on — dev and preview builds, or a production build explicitly built
  // with VITE_PILOT_HELP_ACCOUNTS=1 for the pilot cohort. Default
  // production builds ship the honest credential-free answers.
  readonly VITE_PILOT_HELP_ACCOUNTS?: string;
  // Vite built-ins
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Side-effect CSS imports (e.g. `import './styles/base.css'`)
declare module '*.css';

// Static asset imports (only used for the favicon — kept for completeness)
declare module '*.svg' {
  const url: string;
  export default url;
}

// Vite ?url suffix turns any import into a same-origin URL string —
// used by the PDF viewer to load the worker as a module.
declare module '*?url' {
  const url: string;
  export default url;
}
