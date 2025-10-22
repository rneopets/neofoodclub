import { Button, Drawer, Portal, Stack, CloseButton } from '@chakra-ui/react';
import * as React from 'react';
import { FaCode, FaTable } from 'react-icons/fa';

import { AllBetsModal } from './AllBetsModal';
import { RoundJsonModal } from './RoundJsonModal';

interface DevModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevModeDrawer: React.FC<DevModeDrawerProps> = ({ isOpen, onClose }) => {
  const [isJsonModalOpen, setIsJsonModalOpen] = React.useState(false);
  const [isAllBetsModalOpen, setIsAllBetsModalOpen] = React.useState(false);

  return (
    <>
      <Drawer.Root
        open={isOpen}
        onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
        placement="end"
        size="sm"
        preventScroll
        modal
      >
        <Portal container={document.body}>
          <Drawer.Backdrop />
          <Drawer.Positioner padding={2}>
            <Drawer.Content rounded="md">
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
              <Drawer.Header>
                <Drawer.Title>Dev Mode</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap={3}>
                  <Button width="full" onClick={() => setIsJsonModalOpen(true)}>
                    <FaCode />
                    View Current Round JSON
                  </Button>
                  <Button width="full" onClick={() => setIsAllBetsModalOpen(true)}>
                    <FaTable />
                    View All Possible Bets
                  </Button>
                </Stack>
              </Drawer.Body>
              <Drawer.Footer>
                <Button onClick={onClose} width="full">
                  Close
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <RoundJsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} />
      <AllBetsModal isOpen={isAllBetsModalOpen} onClose={() => setIsAllBetsModalOpen(false)} />
    </>
  );
};
