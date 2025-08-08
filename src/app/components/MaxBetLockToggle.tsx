import { IconButton } from '@chakra-ui/react';
import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useRoundDataStore } from '../stores';
import { getMaxBetLocked, getMaxBet, calculateBaseMaxBet } from '../util';

import { Tooltip } from '@/components/ui/tooltip';

interface MaxBetLockToggleProps {
  onToggle?: (locked: boolean) => void;
}

const MaxBetLockToggle = memo(({ onToggle }: MaxBetLockToggleProps) => {
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
    onToggle?.(newValue);
  }, [isLocked, cookies, currentSelectedRound, onToggle]);

  const tooltipLabel = isLocked
    ? 'Max bet is locked - will not increase with round number'
    : 'Max bet is unlocked - will increase by 2 per round';

  return (
    <Tooltip content={tooltipLabel} showArrow placement="top" openDelay={600}>
      <IconButton
        aria-label={isLocked ? 'Unlock max bet' : 'Lock max bet'}
        size="2xs"
        variant="ghost"
        colorPalette={isLocked ? 'red' : 'green'}
        onClick={handleToggle}
        data-testid="max-bet-lock-toggle"
        p={1}
      >
        {isLocked ? <FaLock /> : <FaLockOpen />}
      </IconButton>
    </Tooltip>
  );
});

MaxBetLockToggle.displayName = 'MaxBetLockToggle';

export default MaxBetLockToggle;
