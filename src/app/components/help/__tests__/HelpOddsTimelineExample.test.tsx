import { describe, it, expect } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { HelpOddsTimelineExample } from '../HelpOddsTimelineExample';

describe('HelpOddsTimelineExample', () => {
  it('renders without throwing and produces visible output', () => {
    render(<HelpOddsTimelineExample />);

    expect(screen.getByRole('img', { name: 'Example odds timeline' })).toBeInTheDocument();
  });
});
