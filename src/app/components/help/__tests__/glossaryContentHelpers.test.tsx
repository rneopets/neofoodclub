import { describe, it, expect } from 'vitest';

import { render, screen } from '../../../../test/utils';
import { seeGlossary, GlossaryFormula } from '../glossaryContentHelpers';

describe('seeGlossary', () => {
  it('includes the given term in the rendered text', () => {
    render(<div>{seeGlossary('Bust rate')}</div>);

    expect(screen.getByText(/See the Glossary entry for/)).toBeInTheDocument();
    expect(screen.getByText(/Bust rate/)).toBeInTheDocument();
  });
});

describe('GlossaryFormula', () => {
  it('renders its children inside a code element', () => {
    render(<GlossaryFormula>ER = odds x probability</GlossaryFormula>);

    const formula = screen.getByText('ER = odds x probability');
    expect(formula.tagName.toLowerCase()).toBe('code');
  });
});
