import { ChakraProvider } from '@chakra-ui/react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { vi } from 'vitest';

import theme from '../theme';

// Custom render function that includes Chakra UI provider
const AllTheProviders = ({ children }: { children: React.ReactNode }): ReactElement => (
  <ChakraProvider theme={theme}>{children}</ChakraProvider>
);

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock drag and drop events
export const createMockDataTransfer = (data: Record<string, string> = {}): DataTransfer => ({
  getData: vi.fn((type: string) => data[type] || ''),
  setData: vi.fn(),
  files: [] as unknown as FileList,
  items: [] as unknown as DataTransferItemList,
  types: Object.keys(data),
  effectAllowed: 'all' as const,
  dropEffect: 'none' as const,
  clearData: vi.fn(),
  setDragImage: vi.fn(),
});

// Helper to create mock drag events
export const createMockDragEvent = (type: string, dataTransfer?: Record<string, string>): Event => {
  const event = new Event(type) as DragEvent;

  // Add dataTransfer to the event
  Object.defineProperty(event, 'dataTransfer', {
    value: createMockDataTransfer(dataTransfer),
    writable: false,
  });

  return event;
};

// Helper to wait for async operations
export const waitFor = (fn: () => void | Promise<void>, timeout = 5000): Promise<void> =>
  new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async (): Promise<void> => {
      try {
        await fn();
        resolve(undefined);
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(check, 100);
        }
      }
    };

    check();
  });
