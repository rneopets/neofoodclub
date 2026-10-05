import { beforeEach, describe, expect, it } from 'vitest';

import { render, screen, fireEvent } from '../../test/utils';
import { HelpGuideProvider } from '../components/help/HelpGuideProvider';
import { UserscriptModal } from '../components/modals/UserscriptModal';
import Footer from '../Footer';
import { useUserscriptModalStore } from '../stores/userscriptModalStore';

describe('Footer', () => {
  beforeEach(() => {
    useUserscriptModalStore.setState({ isOpen: false });
  });

  it('opens the userscript modal from the Bet Userscript link', async () => {
    render(
      <HelpGuideProvider>
        <Footer />
        <UserscriptModal />
      </HelpGuideProvider>,
    );

    fireEvent.click(screen.getByTestId('userscript-footer-link'));

    expect(await screen.findByTestId('userscript-modal')).toBeInTheDocument();
  });

  it('links to the current Food Club pages on Neopets', () => {
    render(
      <HelpGuideProvider>
        <Footer />
      </HelpGuideProvider>,
    );

    const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href') ?? '');
    expect(hrefs).toContain('https://www.neopets.com/pirates/foodclub.phtml?tab=bet');
    expect(hrefs).toContain('https://www.neopets.com/pirates/foodclub.phtml?tab=current');
    expect(hrefs).toContain('https://www.neopets.com/pirates/foodclub.phtml?tab=collect');
    expect(hrefs.some(href => href.includes('?type='))).toBe(false);
  });
});
