import { describe, it, expect, vi } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { useFormattedDate } from '../../../hooks/useFormattedDate';
import DateFormatter from '../DateFormatter';

vi.mock('../../../hooks/useFormattedDate', () => ({
  useFormattedDate: vi.fn(),
}));

const mockUseFormattedDate = vi.mocked(useFormattedDate);

describe('DateFormatter', () => {
  it('renders the formatted date text content inside a span', () => {
    mockUseFormattedDate.mockReturnValue({ formattedDate: 'July 9, 2026', title: '' });

    render(<DateFormatter date="2026-07-09" />);

    const span = screen.getByText('July 9, 2026');
    expect(span).toBeInTheDocument();
    expect(span.tagName).toBe('SPAN');
  });

  it('passes through arbitrary HTML span props', () => {
    mockUseFormattedDate.mockReturnValue({ formattedDate: 'July 9, 2026', title: '' });

    render(<DateFormatter date="2026-07-09" className="my-class" data-testid="date-formatter" />);

    const span = screen.getByTestId('date-formatter');
    expect(span).toBeInTheDocument();
    expect(span).toHaveClass('my-class');
    expect(span).toHaveTextContent('July 9, 2026');
  });

  it('sets the title attribute when withTitle/titleFormat produce one', () => {
    mockUseFormattedDate.mockReturnValue({
      formattedDate: 'July 9, 2026',
      title: 'Thursday, July 9, 2026',
    });

    render(<DateFormatter date="2026-07-09" withTitle titleFormat="dddd, MMMM D, YYYY" />);

    const span = screen.getByText('July 9, 2026');
    expect(span).toHaveAttribute('title', 'Thursday, July 9, 2026');
  });

  it('omits a meaningful title attribute when not provided', () => {
    mockUseFormattedDate.mockReturnValue({ formattedDate: 'July 9, 2026', title: '' });

    render(<DateFormatter date="2026-07-09" />);

    const span = screen.getByText('July 9, 2026');
    expect(span).toHaveAttribute('title', '');
  });

  it('calls useFormattedDate with the provided options', () => {
    mockUseFormattedDate.mockReturnValue({ formattedDate: 'July 9, 2026', title: '' });

    render(<DateFormatter date="2026-07-09" format="MMMM D, YYYY" fromNow tz="UTC" />);

    expect(mockUseFormattedDate).toHaveBeenCalledWith('2026-07-09', {
      format: 'MMMM D, YYYY',
      fromNow: true,
      tz: 'UTC',
    });
  });
});
