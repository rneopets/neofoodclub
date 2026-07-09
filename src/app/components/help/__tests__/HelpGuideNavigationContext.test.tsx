import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';

import {
  useHelpGuideNavigation,
  HelpGuideNavigationProvider,
  type HelpGuideNavigateToEntry,
} from '../HelpGuideNavigationContext';

describe('useHelpGuideNavigation', () => {
  it('returns null outside of a provider', () => {
    const { result } = renderHook(() => useHelpGuideNavigation());

    expect(result.current).toBeNull();
  });

  it('returns the provided function value inside a HelpGuideNavigationProvider', () => {
    const navigate: HelpGuideNavigateToEntry = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
      <HelpGuideNavigationProvider value={navigate}>{children}</HelpGuideNavigationProvider>
    );

    const { result } = renderHook(() => useHelpGuideNavigation(), { wrapper });

    expect(result.current).toBe(navigate);
  });
});
