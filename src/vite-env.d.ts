// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GIT_COMMIT_SHA: string;
  readonly DISABLE_REACT_SCAN: string;
  readonly VITEST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
