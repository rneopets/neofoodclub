import { describe, it, expect, vi } from 'vitest';

import { render } from '../../../../test/utils';
import { useIsRoundOver } from '../../../hooks/useIsRoundOver';
import { useRoundProgress } from '../../../hooks/useRoundProgress';
import TopProgressBar from '../TopProgressBar';

vi.mock('../../../hooks/useIsRoundOver', () => ({
  useIsRoundOver: vi.fn(),
}));

vi.mock('../../../hooks/useRoundProgress', () => ({
  useRoundProgress: vi.fn(),
}));

const mockUseIsRoundOver = vi.mocked(useIsRoundOver);
const mockUseRoundProgress = vi.mocked(useRoundProgress);

describe('TopProgressBar', () => {
  it('renders nothing when the round is over', () => {
    mockUseIsRoundOver.mockReturnValue(true);
    mockUseRoundProgress.mockReturnValue(50);

    const { container } = render(<TopProgressBar />);

    expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
  });

  it('renders the progress bar when the round is not over', () => {
    mockUseIsRoundOver.mockReturnValue(false);
    mockUseRoundProgress.mockReturnValue(42);

    const { container } = render(<TopProgressBar />);

    expect(container).not.toBeEmptyDOMElement();
    const progressRoot = container.querySelector('[role="progressbar"]');
    expect(progressRoot).toBeInTheDocument();
  });

  it('renders with a null progress value when round percent is 100 or more', () => {
    mockUseIsRoundOver.mockReturnValue(false);
    mockUseRoundProgress.mockReturnValue(100);

    const { container } = render(<TopProgressBar />);

    const progressRoot = container.querySelector('[role="progressbar"]');
    expect(progressRoot).toBeInTheDocument();
  });
});
