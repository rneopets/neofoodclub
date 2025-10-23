import { Alert, Box, Button, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaExclamationCircle } from 'react-icons/fa';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Box p={8} maxW="lg" mx="auto" mt={8}>
          <VStack gap={4}>
            <Alert.Root status="error">
              <Alert.Indicator>
                <FaExclamationCircle />
              </Alert.Indicator>
              <Box>
                <Alert.Title>Something went wrong!</Alert.Title>
                <Alert.Description>
                  The application encountered an unexpected error and needs to be reloaded.
                </Alert.Description>
              </Box>
            </Alert.Root>

            {this.state.error && (
              <Box
                as="pre"
                p={4}
                bg="red.50"
                borderRadius="md"
                fontSize="sm"
                overflow="auto"
                maxW="100%"
                w="100%"
                color="red.900"
              >
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </Box>
            )}

            <VStack gap={2}>
              <Button colorPalette="blue" onClick={this.handleReload}>
                Reload Page
              </Button>
              <Button variant="ghost" onClick={this.handleReset}>
                Try Again
              </Button>
            </VStack>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
