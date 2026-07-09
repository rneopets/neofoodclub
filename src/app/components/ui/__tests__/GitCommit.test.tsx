import { describe, it, expect, vi, afterEach } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { GitCommit } from '../GitCommit';

describe('GitCommit', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the short hash without a link when the commit is "development"', () => {
    vi.stubEnv('VITE_GIT_COMMIT_SHA', 'development');

    render(<GitCommit />);

    expect(screen.getByText('develop')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a link to the commit on GitHub with the short hash when a real commit sha is set', () => {
    vi.stubEnv('VITE_GIT_COMMIT_SHA', 'abcdef1234567890');

    render(<GitCommit />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/rneopets/neofoodclub/commit/abcdef1234567890',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('abcdef1');
  });
});
