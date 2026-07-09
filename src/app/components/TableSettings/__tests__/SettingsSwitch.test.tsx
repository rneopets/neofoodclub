import userEvent from '@testing-library/user-event';
import { FaGear } from 'react-icons/fa6';
import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import SettingsSwitch from '../SettingsSwitch';

describe('SettingsSwitch', () => {
  it('renders the label and icon via SettingsRow delegation', () => {
    render(
      <SettingsSwitch
        icon={FaGear}
        label="My Switch"
        colorPalette="blue"
        checked={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('My Switch')).toBeInTheDocument();
  });

  it('does not crash when tooltipText is omitted and forwards click behavior normally', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsSwitch
        icon={FaGear}
        label="My Switch"
        colorPalette="blue"
        checked={false}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('My Switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not crash when tooltipText is provided and still forwards click behavior normally', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsSwitch
        icon={FaGear}
        label="My Switch"
        colorPalette="blue"
        checked={false}
        onChange={onChange}
        tooltipText="Some helpful text"
      />,
    );

    expect(screen.getByText('My Switch')).toBeInTheDocument();

    await user.click(screen.getByText('My Switch'));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('respects the disabled prop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsSwitch
        icon={FaGear}
        label="My Switch"
        colorPalette="blue"
        checked={false}
        onChange={onChange}
        disabled
      />,
    );

    await user.click(screen.getByText('My Switch'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
