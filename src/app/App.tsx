import { JSX, useEffect } from 'react';

import ErrorBoundary from './components/ui/ErrorBoundary';
import HomePage from './HomePage';
import { useInitializeRoundData } from './stores';
import { initReactScanIfEnabled } from './util/reactScan';

function App(): JSX.Element {
  const initialize = useInitializeRoundData();

  // Initialize round data
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    void initReactScanIfEnabled();
  }, []);

  return (
    <ErrorBoundary>
      <HomePage />
    </ErrorBoundary>
  );
}

export default App;
