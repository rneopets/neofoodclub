/* eslint-disable no-console */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './index.css';
import App from './app/App';
import DropZone from './app/DropZone';
import FaviconGenerator from './app/FaviconGenerator';

import { Provider } from '@/components/ui/provider';

// Vite-specific environment variable access
window.ENV = {
  REACT_APP_VERCEL_GIT_COMMIT_SHA: import.meta.env.REACT_APP_VERCEL_GIT_COMMIT_SHA,
};

// Register service worker without automatic updates
if ('serviceWorker' in navigator) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Log that a new version is available, but don't force refresh
      console.log('New app version available. Will be applied on next page refresh.');
      // updateSW(true);
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

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
