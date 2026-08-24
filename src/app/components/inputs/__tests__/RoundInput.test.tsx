import { describe, it, expect, vi } from 'vitest';

import { render, screen, fireEvent, waitFor } from '../../../../test/utils';
import RoundInput from '../RoundInput';

// The component falls back to the round store only when the relevant props are omitted and
// for its `error` state (null by default). Passing selectedRound/referenceRound/onRoundChange
// keeps these tests hermetic: no store setup and no network fetches (onRoundChange replaces
// the store's updateSelectedRound, which would otherwise trigger a round-data fetch).

const noop = vi.fn<() => void>();

// The underlying Chakra/Ark number input syncs its DOM value on requestAnimationFrame and
// moves between machine states via microtasks, so assertions about the displayed value must
// go through waitFor (a synchronous expect right after a click runs before the DOM is synced).

describe('RoundInput', () => {
  it('renders the left (previous) and right (next) stepper buttons', () => {
    render(<RoundInput selectedRound={8000} referenceRound={8001} onRoundChange={noop} />);

    const prev = screen.getByRole('button', { name: 'Previous round' });
    const next = screen.getByRole('button', { name: 'Next round' });

    expect(prev).toHaveAttribute('data-testid', 'round-input-decrement');
    expect(next).toHaveAttribute('data-testid', 'round-input-increment');
  });

  it('shows the selected round in the input', () => {
    render(<RoundInput selectedRound={8000} referenceRound={8001} onRoundChange={noop} />);

    expect(screen.getByTestId('round-input-field')).toHaveValue('8000');
  });

  it('steps forward and back with the left/right buttons', async () => {
    render(<RoundInput selectedRound={8000} referenceRound={8001} onRoundChange={noop} />);

    const field = screen.getByTestId('round-input-field');

    fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
    await waitFor(() => expect(field).toHaveValue('8001'));

    fireEvent.click(screen.getByRole('button', { name: 'Previous round' }));
    await waitFor(() => expect(field).toHaveValue('8000'));

    fireEvent.click(screen.getByRole('button', { name: 'Previous round' }));
    await waitFor(() => expect(field).toHaveValue('7999'));
  });

  it('clamps at the minimum round of 1 when stepping backwards', async () => {
    render(<RoundInput selectedRound={1} referenceRound={2} onRoundChange={noop} />);

    const field = screen.getByTestId('round-input-field');
    fireEvent.click(screen.getByRole('button', { name: 'Previous round' }));

    // 1 - 1 would be 0, but rounds are clamped at the min of 1.
    await waitFor(() => expect(field).toHaveValue('1'));
  });

  it('commits the stepped round through onRoundChange after the debounce delay', async () => {
    const onRoundChange = vi.fn();
    render(<RoundInput selectedRound={8000} referenceRound={8001} onRoundChange={onRoundChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next round' }));

    // The 400ms debounce elapses and the new round is committed.
    await waitFor(() => expect(onRoundChange).toHaveBeenCalledWith(8001));
  });

  it('keeps the typed-input path working (typing still updates and commits)', async () => {
    const onRoundChange = vi.fn();
    render(<RoundInput selectedRound={8000} referenceRound={8001} onRoundChange={onRoundChange} />);

    const field = screen.getByTestId('round-input-field');
    // zag only handles INPUT.CHANGE once the input is focused (machine state), so focus first
    // and give its microtask transition a beat before typing. It reads the native `input`
    // event, so dispatch that rather than change.
    fireEvent.focus(field);
    await new Promise(r => setTimeout(r, 0));

    fireEvent.input(field, { target: { value: '9999' } });
    await waitFor(() => expect(onRoundChange).toHaveBeenCalledWith(9999));
  });
});
