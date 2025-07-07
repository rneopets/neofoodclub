import { Collapse, HStack, VStack } from '@chakra-ui/react';
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
      <VStack spacing={2} align="stretch" width="100%" display={{ base: 'flex', md: 'none' }}>
        <MobileSwitchBox
          icon={FaBrain}
          label="Big Brain Mode"
          colorScheme="pink"
          isChecked={bigBrain}
          onChange={handleBigBrainChange}
        />

        <Collapse in={isBigBrainAndNormalMode}>
          <VStack spacing={2} align="stretch" width="100%">
            <MobileSwitchBox
              icon={FaTimeline}
              label="Odds Timeline"
              colorScheme="purple"
              isChecked={oddsTimeline}
              onChange={handleOddsTimelineChange}
              isDisabled={!isBigBrainAndNormalMode}
              tooltipText="Odds Timeline"
            />

            <MobileSwitchBox
              icon={FaCookieBite}
              label="FA Details"
              colorScheme="orange"
              isChecked={faDetails}
              onChange={handleFaDetailsChange}
              isDisabled={!isBigBrainAndNormalMode}
              tooltipText="FA Details"
            />

            <MobileSwitchBox
              icon={FaSliders}
              label="Custom Probs/Odds"
              colorScheme="blue"
              isChecked={customOddsMode}
              onChange={handleCustomOddsModeChange}
              isDisabled={!isBigBrainAndNormalMode}
              tooltipText="Custom Probs/Odds"
            />
          </VStack>
        </Collapse>
      </VStack>

      {/* Desktop view */}
      <HStack spacing={3.5} display={{ base: 'none', md: 'flex' }}>
        <SettingSwitch
          icon={FaBrain}
          color="pink"
          isChecked={bigBrain}
          onChange={handleBigBrainChange}
          tooltipLabel="Big Brain Mode"
        />

        {isNormalMode && (
          <>
            <SettingSwitch
              icon={FaTimeline}
              color="purple"
              isChecked={oddsTimeline}
              onChange={handleOddsTimelineChange}
              isDisabled={!isBigBrainAndNormalMode}
              tooltipLabel="Odds Timeline"
            />

            <SettingSwitch
              icon={FaCookieBite}
              color="orange"
              isChecked={faDetails}
              onChange={handleFaDetailsChange}
              isDisabled={!isBigBrainAndNormalMode}
              tooltipLabel="FA Details"
            />

            <SettingSwitch
              icon={FaSliders}
              color="blue"
              isChecked={customOddsMode}
              onChange={handleCustomOddsModeChange}
              isDisabled={!isBigBrainAndNormalMode}
              tooltipLabel="Custom Probs/Odds"
            />
          </>
        )}
      </HStack>
    </>
  );
});

Extras.displayName = 'Extras';

export default Extras;
