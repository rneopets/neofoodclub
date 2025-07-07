// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_VERCEL_GIT_COMMIT_SHA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
