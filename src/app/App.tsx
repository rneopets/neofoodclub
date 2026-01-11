import { JSX, useEffect } from 'react';

import ErrorBoundary from './components/ui/ErrorBoundary';
import HomePage from './HomePage';
import { useInitializeRoundData } from './stores';

function App(): JSX.Element {
  const initialize = useInitializeRoundData();

  // Initialize round data
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <HomePage />
    </ErrorBoundary>
  );
}

export default App;
