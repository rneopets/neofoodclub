import { Button, CloseButton, Dialog, Heading, Link, Portal, Stack, Text } from '@chakra-ui/react';
import * as React from 'react';
import { FaDownload } from 'react-icons/fa6';

import { USERSCRIPT_URL } from '../../constants';
import { useUserscriptModalStore } from '../../stores/userscriptModalStore';

/** Explains the userscript. The banner and the footer link open it through a shared store. */
export const UserscriptModal: React.FC = () => {
  const isOpen = useUserscriptModalStore(state => state.isOpen);
  const close = useUserscriptModalStore(state => state.close);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && close()}
      size="lg"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="userscript-modal">
            <Dialog.Header>
              <Dialog.Title>NeoFoodClub bet userscript</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Text>
                  Neopets no longer accepts bets from a link, so the Place bet! buttons here now
                  open the Food Club bet page with your bet set in the link. The userscript reads
                  the bets from that link and shows them on the Neopets page, where you can place
                  each one.
                </Text>
                <Text>
                  Every Place bet! button opens the same link, because the link carries your whole
                  bet set, not just that row&apos;s bet. You only need to use one of them.
                </Text>

                <Heading size="sm">What it does</Heading>
                <Text>
                  It adds a NeoFoodClub box above the pirates on the Neopets bet page, listing every
                  bet in your set with its pirates and odds. Each bet has a{' '}
                  <strong>Select Pirates + Fill Max Bet #</strong> button that selects its pirates
                  in the Neopets form and fills in your max bet, and you then press Neopets&apos;
                  own Place a Bet button.
                </Text>
                <Text>
                  If you open the Neopets bet page without a link, the box has a place to paste a
                  NeoFoodClub bet URL into, and it shows those bets instead.
                </Text>
                <Text>
                  To set the amount yourself, click a bet&apos;s row instead. That selects its
                  pirates and leaves the amount alone.
                </Text>
                <Text>
                  The box also has a <strong>Place bets</strong> setting, off by default. Turn it on
                  and the buttons read <strong>Max Bet + Place Bet #</strong>: they do the same
                  thing and then press Place a Bet for you.
                </Text>
                <Text>
                  The box has a <strong>Cap bet amounts</strong> setting, on by default, that works
                  like the same setting here: a bet never stakes more than it needs to reach the 1M
                  payout limit. Turn it off to always stake your full max bet.
                </Text>
                <Text>
                  A bet is only placed when you press Place a Bet, or click one of the buttons while
                  the Place bets setting is on. The script never sends anything to Neopets itself
                  and never sees your login. Neopets&apos; own checks and messages still apply.
                </Text>
                <Text>
                  Nothing is selected, filled in or placed until you click a row or a button.
                </Text>
                <Text>
                  The userscript can&apos;t tell which of your bets have been placed, only how many,
                  so every bet&apos;s button stays there after you use it. The footer of the box
                  shows how many bets you have placed this round, so you can keep track.
                </Text>

                <Heading size="sm">How to install</Heading>
                <Text>
                  1. Install a userscript manager for your browser, such as{' '}
                  <Link
                    href="https://www.tampermonkey.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tampermonkey
                  </Link>{' '}
                  or{' '}
                  <Link
                    href="https://violentmonkey.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Violentmonkey
                  </Link>
                  .
                  <br />
                  2. Open the script below. Your userscript manager will offer to install it.
                  <br />
                  3. Click a Place bet! button here to open the Neopets bet page, then place your
                  bets there with the buttons in the NeoFoodClub box.
                </Text>
                <Button asChild alignSelf="flex-start" colorPalette="nfc-green" variant="surface">
                  <a href={USERSCRIPT_URL} target="_blank" rel="noopener noreferrer">
                    <FaDownload /> Install the userscript
                  </a>
                </Button>
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
