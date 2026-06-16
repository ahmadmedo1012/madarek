// Vite-injected env vars
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
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
