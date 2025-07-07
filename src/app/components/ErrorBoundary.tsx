import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

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
          <VStack spacing={4}>
            <Alert status="error">
              <AlertIcon />
              <Box>
                <AlertTitle>Something went wrong!</AlertTitle>
                <AlertDescription>
                  The application encountered an unexpected error and needs to be reloaded.
                </AlertDescription>
              </Box>
            </Alert>

            <VStack spacing={2}>
              <Button colorScheme="blue" onClick={this.handleReload}>
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
