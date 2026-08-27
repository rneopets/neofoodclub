import { Button, Drawer, Portal, Stack, CloseButton, Separator } from '@chakra-ui/react';
import * as React from 'react';
import {
  FaBalanceScale,
  FaCode,
  FaCrosshairs,
  FaFileCsv,
  FaStopwatch,
  FaTable,
  FaTrophy,
} from 'react-icons/fa';
import { FaChartPie, FaGauge, FaMagnifyingGlassChart } from 'react-icons/fa6';

import { useDisclosureState } from '../../hooks/useDisclosureState';
import { getReactScanEnabled, setReactScanEnabled } from '../../util/reactScan';
import { AllBetsModal } from '../modals/AllBetsModal';
import { ArenaInsightsModal } from '../modals/ArenaInsightsModal';
import { BacktestComparisonModal } from '../modals/BacktestComparisonModal';
import { FcDataModal } from '../modals/FcDataModal';
import { HallOfFameModal } from '../modals/HallOfFameModal';
import { PirateMatchupModal } from '../modals/PirateMatchupModal';
import { RoundEndDriftModal } from '../modals/RoundEndDriftModal';
import { RoundJsonModal } from '../modals/RoundJsonModal';
import { WasmEnginePerfModal } from '../modals/WasmEnginePerfModal';
import SettingsSwitch from '../TableSettings/SettingsSwitch';

interface DevModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevModeDrawer: React.FC<DevModeDrawerProps> = ({ isOpen, onClose }) => {
  const jsonModal = useDisclosureState(false);
  const allBetsModal = useDisclosureState(false);
  const backtestModal = useDisclosureState(false);
  const hallOfFameModal = useDisclosureState(false);
  const perfModal = useDisclosureState(false);
  const insightsModal = useDisclosureState(false);
  const driftModal = useDisclosureState(false);
  const matchupModal = useDisclosureState(false);
  const fcDataModal = useDisclosureState(false);
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
                  <Button width="full" onClick={backtestModal.onOpen}>
                    <FaBalanceScale />
                    Compare Bet Strategies
                  </Button>
                  <Button width="full" onClick={hallOfFameModal.onOpen}>
                    <FaTrophy />
                    Bet Hall of Fame
                  </Button>
                  <Button width="full" onClick={perfModal.onOpen}>
                    <FaGauge />
                    Wasm Engine Perf
                  </Button>
                  <Button width="full" onClick={insightsModal.onOpen}>
                    <FaChartPie />
                    Arena Insights
                  </Button>
                  <Button width="full" onClick={driftModal.onOpen}>
                    <FaStopwatch />
                    Round End-Time Drift
                  </Button>
                  <Button width="full" onClick={matchupModal.onOpen}>
                    <FaCrosshairs />
                    Pirate Matchups (Head-to-Head)
                  </Button>
                  <Button width="full" onClick={fcDataModal.onOpen}>
                    <FaFileCsv />
                    FC Data Visualizer (NeoBot CSV)
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
      <BacktestComparisonModal isOpen={backtestModal.isOpen} onClose={backtestModal.onClose} />
      <HallOfFameModal isOpen={hallOfFameModal.isOpen} onClose={hallOfFameModal.onClose} />
      <RoundEndDriftModal isOpen={driftModal.isOpen} onClose={driftModal.onClose} />
      <PirateMatchupModal isOpen={matchupModal.isOpen} onClose={matchupModal.onClose} />
      <FcDataModal isOpen={fcDataModal.isOpen} onClose={fcDataModal.onClose} />
      <WasmEnginePerfModal isOpen={perfModal.isOpen} onClose={perfModal.onClose} />
      <ArenaInsightsModal isOpen={insightsModal.isOpen} onClose={insightsModal.onClose} />
    </>
  );
};
