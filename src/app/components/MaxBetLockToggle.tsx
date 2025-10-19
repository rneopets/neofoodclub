import { IconButton } from '@chakra-ui/react';
import { memo } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa6';

import { Tooltip } from '@/components/ui/tooltip';

interface MaxBetLockToggleProps {
  isLocked: boolean;
  onToggle: (locked: boolean) => void;
  maxBet: number;
}

const MaxBetLockToggle = memo(({ isLocked: locked, onToggle, maxBet }: MaxBetLockToggleProps) => {
  const tooltipLabel = locked
    ? 'Max bet is locked - will not increase with round number'
    : maxBet === -1000
      ? 'Max bet is unlocked'
      : 'Max bet is unlocked - will increase by 2 per round';

  return (
    <Tooltip content={tooltipLabel} showArrow placement="top" openDelay={600} paddingInline={0}>
      <IconButton
        size="2xs"
        variant="ghost"
        onClick={() => onToggle(!locked)}
        data-testid="max-bet-lock-toggle"
        pointerEvents="auto"
      >
        {locked ? <FaLock /> : <FaLockOpen />}
      </IconButton>
    </Tooltip>
  );
});

MaxBetLockToggle.displayName = 'MaxBetLockToggle';

export default MaxBetLockToggle;
