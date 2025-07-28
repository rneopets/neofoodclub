import { HStack, VStack } from '@chakra-ui/react';
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

import MobileSwitchBox from './MobileSwitchBox';
import SettingSwitch from './SettingSwitch';

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
    <>
      {/* Mobile view */}
      <VStack gap={2} align="stretch" width="100%" display={{ base: 'flex', md: 'none' }}>
        <MobileSwitchBox
          icon={FaBrain}
          label="Big Brain Mode"
          colorPalette="pink"
          checked={bigBrain}
          onChange={handleBigBrainChange}
        />

        {isBigBrainAndNormalMode && (
          <MobileSwitchBox
            icon={FaTimeline}
            label="Odds Timeline"
            colorPalette="purple"
            checked={oddsTimeline}
            onChange={handleOddsTimelineChange}
            disabled={!isBigBrainAndNormalMode}
            tooltipText="Odds Timeline"
          />
        )}
        {isBigBrainAndNormalMode && (
          <MobileSwitchBox
            icon={FaCookieBite}
            label="FA Details"
            colorPalette="orange"
            checked={faDetails}
            onChange={handleFaDetailsChange}
            disabled={!isBigBrainAndNormalMode}
            tooltipText="FA Details"
          />
        )}
        {isBigBrainAndNormalMode && (
          <MobileSwitchBox
            icon={FaSliders}
            label="Custom Probs/Odds"
            colorPalette="blue"
            checked={customOddsMode}
            onChange={handleCustomOddsModeChange}
            disabled={!isBigBrainAndNormalMode}
            tooltipText="Custom Probs/Odds"
          />
        )}
      </VStack>

      {/* Desktop view */}
      <HStack display={{ base: 'none', md: 'flex' }}>
        <SettingSwitch
          icon={FaBrain}
          colorPalette="pink"
          checked={bigBrain}
          onChange={handleBigBrainChange}
          tooltipLabel="Big Brain Mode"
        />

        {isNormalMode && (
          <SettingSwitch
            icon={FaTimeline}
            colorPalette="purple"
            checked={oddsTimeline}
            onChange={handleOddsTimelineChange}
            disabled={!isBigBrainAndNormalMode}
            tooltipLabel="Odds Timeline"
          />
        )}
        {isNormalMode && (
          <SettingSwitch
            icon={FaCookieBite}
            colorPalette="orange"
            checked={faDetails}
            onChange={handleFaDetailsChange}
            disabled={!isBigBrainAndNormalMode}
            tooltipLabel="FA Details"
          />
        )}
        {isNormalMode && (
          <SettingSwitch
            icon={FaSliders}
            colorPalette="blue"
            checked={customOddsMode}
            onChange={handleCustomOddsModeChange}
            disabled={!isBigBrainAndNormalMode}
            tooltipLabel="Custom Probs/Odds"
          />
        )}
      </HStack>
    </>
  );
});

Extras.displayName = 'Extras';

export default Extras;
