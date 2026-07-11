/* eslint-disable no-console */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './index.css';
import App from './app/App';
import DropZone from './app/DropZone';
import FaviconGenerator from './app/FaviconGenerator';
import { hydrateBetStoreFromUrl } from './app/stores/betStore';
import { hydrateRoundStoreFromUrl } from './app/stores/roundStore';
import { isProductionHost } from './app/util/isProductionHost';
import { initWasmMath } from './app/wasmMath';

import { Provider } from '@/components/ui/provider';

// Vite-specific environment variable access
window.ENV = {
  VITE_GIT_COMMIT_SHA: import.meta.env.VITE_GIT_COMMIT_SHA,
};

// Non-production builds show the commit hash in the tab title so it's
// obvious which deploy is being viewed.
if (!isProductionHost()) {
  const commitHash = import.meta.env.VITE_GIT_COMMIT_SHA;
  const shortHash = commitHash ? commitHash.substring(0, 7) : 'dev';
  document.title = `NFC [${shortHash}]`;
}

// Register service worker without automatic updates
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Log that a new version is available, but don't force refresh
      console.log('New app version available. Will be applied on next page refresh.');
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

// Load the wasm math core before the app mounts, so every synchronous call
// into src/app/maths.ts - including ones made from useMemo in render bodies -
// is safe from the very first render.
await initWasmMath();

// Parse the URL hash now that the wasm engine is ready. Doing this at
// betStore/roundStore module-eval time (before this await resolves) would
// silently decode to empty bets - the store modules are statically imported
// above, so their top-level code already ran before this line.
hydrateBetStoreFromUrl();
hydrateRoundStoreFromUrl();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FaviconGenerator />
    <Provider>
      <DropZone>
        <App />
      </DropZone>
    </Provider>
  </React.StrictMode>,
);
