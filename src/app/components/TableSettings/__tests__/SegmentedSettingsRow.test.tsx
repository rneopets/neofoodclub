import userEvent from '@testing-library/user-event';
import { FaGear } from 'react-icons/fa6';
import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { SegmentedSettingsRow } from '../SegmentedSettingsRow';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const OPTIONS = [
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
] as const;

describe('SegmentedSettingsRow', () => {
  it('renders the label and icon', () => {
    render(
      <SegmentedSettingsRow
        icon={FaGear}
        label="My Setting"
        value="first"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('My Setting')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <SegmentedSettingsRow
        icon={FaGear}
        label="My Setting"
        value="first"
        options={[...OPTIONS]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('calls onChange with the new value when a different option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedSettingsRow
        icon={FaGear}
        label="My Setting"
        value="first"
        options={[...OPTIONS]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('Second'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('second');
  });

  it('does not call onChange when re-selecting the already active option (null nextValue guard)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedSettingsRow
        icon={FaGear}
        label="My Setting"
        value="first"
        options={[...OPTIONS]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByText('First'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies the provided testId to the segment group root', () => {
    render(
      <SegmentedSettingsRow
        icon={FaGear}
        label="My Setting"
        value="first"
        options={[...OPTIONS]}
        onChange={vi.fn()}
        testId="my-segmented-row"
      />,
    );

    expect(screen.getByTestId('my-segmented-row')).toBeInTheDocument();
  });
});
