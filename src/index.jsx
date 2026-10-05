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
import { initWasmMath } from './app/wasmMath';

import { Provider } from '@/components/ui/provider';

// Vite-specific environment variable access
window.ENV = {
  VITE_GIT_COMMIT_SHA: import.meta.env.VITE_GIT_COMMIT_SHA,
};

// Register the service worker. A new version activates by itself (see skipWaiting in
// vite.config.js), but a page that is already open keeps the version it loaded until it is
// refreshed, so nothing reloads under anyone.
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log(
        'New app version available. It will be used the next time the page is refreshed.',
      );
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
