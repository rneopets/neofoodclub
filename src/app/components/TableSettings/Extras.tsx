import { Box, VStack } from '@chakra-ui/react';
import { memo, useCallback, useMemo } from 'react';
import { FaSliders, FaBrain, FaTimeline, FaCookieBite } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import {
  useBigBrain,
  useCustomOddsMode,
  useFaDetails,
  useTableMode,
  useOddsTimeline,
  useToggleBigBrain,
  useToggleFaDetails,
  useToggleOddsTimeline,
  useToggleCustomOddsMode,
} from '../../stores';

import SettingsSwitch from './SettingsSwitch';

const Extras = memo(() => {
  const bigBrain = useBigBrain();
  const faDetails = useFaDetails();
  const oddsTimeline = useOddsTimeline();
  const customOddsMode = useCustomOddsMode();

  const toggleBigBrain = useToggleBigBrain();
  const toggleFaDetails = useToggleFaDetails();
  const toggleOddsTimeline = useToggleOddsTimeline();
  const toggleCustomOddsMode = useToggleCustomOddsMode();

  const tableMode = useTableMode();

  // Memoize computed values
  const isNormalMode = useMemo(() => tableMode === 'normal', [tableMode]);
  const isBigBrainAndNormalMode = useMemo(() => bigBrain && isNormalMode, [bigBrain, isNormalMode]);

  // Memoize cookies instance
  const cookies = useMemo(() => new Cookies(), []);

  // Memoize all handler functions
  const handleBigBrainChange = useCallback((): void => {
    const newValue = !bigBrain;
    cookies.set('bigBrainMode', newValue);
    toggleBigBrain();
  }, [bigBrain, cookies, toggleBigBrain]);

  const handleFaDetailsChange = useCallback((): void => {
    const newValue = !faDetails;
    cookies.set('faDetailsMode', newValue);
    toggleFaDetails();
  }, [faDetails, cookies, toggleFaDetails]);

  const handleOddsTimelineChange = useCallback((): void => {
    const newValue = !oddsTimeline;
    cookies.set('oddsTimelineMode', newValue);
    toggleOddsTimeline();
  }, [oddsTimeline, cookies, toggleOddsTimeline]);

  const handleCustomOddsModeChange = useCallback((): void => {
    const newValue = !customOddsMode;
    cookies.set('customOddsMode', newValue);
    toggleCustomOddsMode();
  }, [customOddsMode, cookies, toggleCustomOddsMode]);

  return (
    <VStack gap={2} align="stretch" width="100%">
      <SettingsSwitch
        icon={FaBrain}
        label="Big Brain Mode"
        colorPalette="pink"
        checked={bigBrain}
        onChange={handleBigBrainChange}
      />

      {isBigBrainAndNormalMode && (
        <>
          <Box pl={8}>
            <SettingsSwitch
              icon={FaTimeline}
              label="Odds Timeline"
              colorPalette="purple"
              checked={oddsTimeline}
              onChange={handleOddsTimelineChange}
              disabled={!isBigBrainAndNormalMode}
              tooltipText="Odds Timeline"
            />
          </Box>

          <Box pl={8}>
            <SettingsSwitch
              icon={FaCookieBite}
              label="FA Details"
              colorPalette="orange"
              checked={faDetails}
              onChange={handleFaDetailsChange}
              disabled={!isBigBrainAndNormalMode}
              tooltipText="FA Details"
            />
          </Box>

          <Box pl={8}>
            <SettingsSwitch
              icon={FaSliders}
              label="Custom Probs/Odds"
              colorPalette="cyan"
              checked={customOddsMode}
              onChange={handleCustomOddsModeChange}
              disabled={!isBigBrainAndNormalMode}
              tooltipText="Custom Probs/Odds"
            />
          </Box>
        </>
      )}
    </VStack>
  );
});

Extras.displayName = 'Extras';

export default Extras;
