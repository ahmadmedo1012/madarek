// Vite-injected env vars (we only use these two)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
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
