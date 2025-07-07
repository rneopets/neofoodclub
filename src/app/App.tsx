import { useToast } from '@chakra-ui/react';
import { JSX, useEffect } from 'react';

import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './HomePage';
import { useInitializeRoundData } from './stores';
import { setToastFunction } from './stores/roundDataStore';

function App(): JSX.Element {
  const toast = useToast();
  const initialize = useInitializeRoundData();

  useEffect(() => {
    setToastFunction(toast);
  }, [toast]);

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
