import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './index.css';
import App from './app/App';
import DropZone from './app/DropZone';
import FaviconGenerator from './app/FaviconGenerator';
import theme from './theme';

// Vite-specific environment variable access
window.ENV = {
  REACT_APP_VERCEL_GIT_COMMIT_SHA: import.meta.env.REACT_APP_VERCEL_GIT_COMMIT_SHA,
};

// Register service worker with automatic updates
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Automatically apply the update without user notification
      updateSW(true);
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
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <DropZone>
        <App />
      </DropZone>
    </ChakraProvider>
  </React.StrictMode>,
);
