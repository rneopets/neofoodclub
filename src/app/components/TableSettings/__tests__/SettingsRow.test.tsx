import userEvent from '@testing-library/user-event';
import { FaGear } from 'react-icons/fa6';
import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import SettingsRow from '../SettingsRow';

describe('SettingsRow', () => {
  it('renders the label and icon', () => {
    render(
      <SettingsRow
        icon={FaGear}
        label="Enable Feature"
        colorPalette="blue"
        isChecked={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Enable Feature')).toBeInTheDocument();
  });

  it('calls onChange reflecting the toggled checked value when unchecked -> checked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsRow
        icon={FaGear}
        label="Enable Feature"
        colorPalette="blue"
        isChecked={false}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('Enable Feature'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0]?.[0];
    expect(event.target.checked).toBe(true);
    expect(event.currentTarget.checked).toBe(true);
  });

  it('calls onChange reflecting the toggled checked value when checked -> unchecked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsRow
        icon={FaGear}
        label="Enable Feature"
        colorPalette="blue"
        isChecked={true}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('Enable Feature'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0]?.[0];
    expect(event.target.checked).toBe(false);
    expect(event.currentTarget.checked).toBe(false);
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsRow
        icon={FaGear}
        label="Enable Feature"
        colorPalette="blue"
        isChecked={false}
        onChange={onChange}
        disabled
      />,
    );

    await user.click(screen.getByText('Enable Feature'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
