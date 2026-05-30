import { Button, Drawer, Portal, Stack, CloseButton, Text, Separator } from '@chakra-ui/react';
import * as React from 'react';
import { FaCode, FaTable } from 'react-icons/fa';
import { FaMagnifyingGlassChart } from 'react-icons/fa6';

import { useDisclosureState } from '../../hooks/useDisclosureState';
import { useCurrentRound } from '../../stores';
import { getReactScanEnabled, setReactScanEnabled } from '../../util/reactScan';
import RoundInput from '../inputs/RoundInput';
import { AllBetsModal } from '../modals/AllBetsModal';
import { RoundJsonModal } from '../modals/RoundJsonModal';
import SettingsSwitch from '../TableSettings/SettingsSwitch';

interface DevModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevModeDrawer: React.FC<DevModeDrawerProps> = ({ isOpen, onClose }) => {
  const jsonModal = useDisclosureState(false);
  const allBetsModal = useDisclosureState(false);
  const currentRoundFromCdn = useCurrentRound();
  const [isReactScanEnabled, setIsReactScanEnabled] = React.useState(getReactScanEnabled);

  const handleReactScanToggle = React.useCallback((): void => {
    const nextEnabled = !isReactScanEnabled;
    setIsReactScanEnabled(nextEnabled);
    void setReactScanEnabled(nextEnabled);
  }, [isReactScanEnabled]);

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
        <Portal>
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
                  <Stack gap={1} align="stretch">
                    <Text fontSize="sm" fontWeight="medium">
                      Change round
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Current round on Neopets:{' '}
                      {currentRoundFromCdn > 0 ? currentRoundFromCdn : '—'}
                    </Text>
                    <RoundInput />
                  </Stack>
                  <Separator />
                  <SettingsSwitch
                    icon={FaMagnifyingGlassChart}
                    label="React Scan"
                    colorPalette="purple"
                    checked={isReactScanEnabled}
                    onChange={handleReactScanToggle}
                  />
                  <Separator />
                  <Button width="full" onClick={jsonModal.onOpen}>
                    <FaCode />
                    View Round JSON
                  </Button>
                  <Button width="full" onClick={allBetsModal.onOpen}>
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

      <RoundJsonModal isOpen={jsonModal.isOpen} onClose={jsonModal.onClose} />
      <AllBetsModal isOpen={allBetsModal.isOpen} onClose={allBetsModal.onClose} />
    </>
  );
};
