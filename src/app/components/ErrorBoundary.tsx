import { Alert, Box, Button, VStack, Text } from '@chakra-ui/react';
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

            <VStack gap={2}>
              <Button colorPalette="blue" onClick={this.handleReload}>
                Reload Page
              </Button>
              <Button variant="ghost" onClick={this.handleReset}>
                Try Again
              </Button>
            </VStack>

            {process.env['NODE_ENV'] === 'development' && this.state.error && (
              <Box
                as="pre"
                p={4}
                bg="gray.100"
                borderRadius="md"
                fontSize="sm"
                overflow="auto"
                maxW="100%"
              >
                {this.state.error.stack}
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
