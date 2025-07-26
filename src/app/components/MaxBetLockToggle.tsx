import { IconButton } from '@chakra-ui/react';
import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useRoundDataStore } from '../stores';
import { getMaxBetLocked, getMaxBet, calculateBaseMaxBet } from '../util';

import { useColorModeValue } from '@/components/ui/color-mode';
import { Tooltip } from '@/components/ui/tooltip';

const MaxBetLockToggle = memo(() => {
  const [isLocked, setIsLocked] = useState(() => getMaxBetLocked());
  const cookies = useMemo(() => new Cookies(), []);
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);

  // Sync with external changes (like from other tabs)
  useEffect(() => {
    const currentLockState = getMaxBetLocked();
    if (currentLockState !== isLocked) {
      setIsLocked(currentLockState);
    }
  }, [currentSelectedRound, isLocked]);

  const handleToggle = useCallback((): void => {
    const newValue = !isLocked;
    const currentMaxBet = getMaxBet(currentSelectedRound);

    if (newValue) {
      // Locking: save the current max bet value as the locked value
      if (currentMaxBet > 0) {
        cookies.set('lockedMaxBet', currentMaxBet, {
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 100), // 100 years
        });
      }
    } else {
      // Unlocking: ensure we have a proper base max bet for calculations
      if (currentMaxBet > 0) {
        const baseMaxBet = calculateBaseMaxBet(currentMaxBet, currentSelectedRound);
        cookies.set('baseMaxBet', baseMaxBet, {
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 100), // 100 years
        });
      }
    }

    cookies.set('maxBetLocked', newValue);
    setIsLocked(newValue);
  }, [isLocked, cookies, currentSelectedRound]);

  const lockedColor = useColorModeValue('red.500', 'red.400');
  const unlockedColor = useColorModeValue('green.500', 'green.400');

  const tooltipLabel = isLocked
    ? 'Max bet is locked - will not increase with round number'
    : 'Max bet is unlocked - will increase by 2 per round';

  return (
    <Tooltip label={tooltipLabel} hasArrow placement="top" openDelay={600}>
      <IconButton
        aria-label={isLocked ? 'Unlock max bet' : 'Lock max bet'}
        size="xs"
        variant="ghost"
        color={isLocked ? lockedColor : unlockedColor}
        onClick={handleToggle}
        minW="auto"
        h="20px"
        w="20px"
        p={0}
        _hover={{
          backgroundColor: isLocked ? 'red.50' : 'green.50',
          color: isLocked ? 'red.600' : 'green.600',
        }}
        _dark={{
          _hover: {
            backgroundColor: isLocked ? 'red.900' : 'green.900',
            color: isLocked ? 'red.300' : 'green.300',
          },
        }}
        data-testid="max-bet-lock-toggle"
      >
        {isLocked ? <FaLock /> : <FaLockOpen />}
      </IconButton>
    </Tooltip>
  );
});

MaxBetLockToggle.displayName = 'MaxBetLockToggle';

export default MaxBetLockToggle;
