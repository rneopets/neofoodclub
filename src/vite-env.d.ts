// / <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_GIT_COMMIT_SHA: string;
  readonly DISABLE_REACT_SCAN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
