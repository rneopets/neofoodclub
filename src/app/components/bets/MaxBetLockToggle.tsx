import { IconButton } from '@chakra-ui/react';
import { memo } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa6';

import { BET_AMOUNT_DEFAULT } from '../../constants';

import { Tooltip } from '@/components/ui/tooltip';

interface MaxBetLockToggleProps {
  isLocked: boolean;
  onToggle: (locked: boolean) => void;
  maxBet: number;
  size?: '2xs' | 'xs' | 'sm';
}

const MaxBetLockToggle = memo(
  ({ isLocked: locked, onToggle, maxBet, size = '2xs' }: MaxBetLockToggleProps) => {
    const tooltipLabel = locked
      ? 'Max bet is locked - will not increase with round number'
      : maxBet === BET_AMOUNT_DEFAULT
        ? 'Max bet is unlocked'
        : 'Max bet is unlocked - will increase by 2 per round';

    return (
      <Tooltip content={tooltipLabel} showArrow placement="top" openDelay={600} paddingInline={0}>
        <IconButton
          size={size}
          variant="ghost"
          onClick={() => onToggle(!locked)}
          data-testid="max-bet-lock-toggle"
          pointerEvents="auto"
        >
          {locked ? <FaLock /> : <FaLockOpen />}
        </IconButton>
      </Tooltip>
    );
  },
);

MaxBetLockToggle.displayName = 'MaxBetLockToggle';

export default MaxBetLockToggle;
