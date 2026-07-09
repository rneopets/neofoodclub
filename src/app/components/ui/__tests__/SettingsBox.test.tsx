import { describe, it, expect } from 'vitest';

import { render, screen } from '../../../../test/utils';
import SettingsBox from '../SettingsBox';

describe('SettingsBox', () => {
  it('renders children', () => {
    render(
      <SettingsBox>
        <div data-testid="settings-child">Settings Content</div>
      </SettingsBox>,
    );

    expect(screen.getByTestId('settings-child')).toBeInTheDocument();
    expect(screen.getByText('Settings Content')).toBeInTheDocument();
  });

  it('applies the background prop as the bg style', () => {
    render(
      <SettingsBox background="red.500" data-testid="settings-box">
        <span>Content</span>
      </SettingsBox>,
    );

    const box = screen.getByTestId('settings-box');
    expect(box).toBeInTheDocument();
  });

  it('forwards additional Flex props', () => {
    render(
      <SettingsBox data-testid="settings-box" aria-label="my settings">
        <span>Content</span>
      </SettingsBox>,
    );

    const box = screen.getByTestId('settings-box');
    expect(box).toHaveAttribute('aria-label', 'my settings');
  });
});
