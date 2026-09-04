import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

import { initWasmMath } from '../app/wasmMath';

// @testing-library/jest-dom's own `/vitest` entrypoint declares `Assertion<T = any>`, which
// doesn't match vitest 5's `Assertion<R = void, T = unknown>` (jest-dom hasn't published a
// vitest-5-compatible release yet). Extend vitest's own `expect` directly instead; the
// `Assertion` augmentation lives in ./jest-dom-vitest.d.ts.
expect.extend(jestDomMatchers);

// Load the wasm math core before any test runs (mirrors src/index.jsx).
await initWasmMath();

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock console methods to reduce noise in tests
(globalThis as unknown as { console: Console }).console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLCanvasElement.getContext for Chart.js tests.
// Chart.js's DomPlatform.acquireContext() only accepts the returned context if
// `context.canvas === canvas` (see chart.js's DomPlatform.acquireContext), so the mock
// must be a real `function` (not an arrow function) and echo back `this` as `canvas` -
// otherwise Chart.js silently refuses to construct any chart in tests ("can't acquire
// context from the given item"), masking real bugs instead of exercising them.
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
  if (contextId === '2d') {
    return {
      canvas: this,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => new Uint8ClampedArray(4)),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as HTMLCanvasElement['getContext'];

// Mock ResizeObserver. Chart.js's responsive plugin does `new ResizeObserver(...)`, and an
// arrow-function mock implementation can't be used with `new` - use a real `function` (as a
// constructor) instead, like the getContext mock above.
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = function () {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };
} as unknown as typeof ResizeObserver;
