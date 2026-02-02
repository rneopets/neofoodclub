import { Box, Progress } from '@chakra-ui/react';
import React from 'react';

import { useIsRoundOver } from '../../hooks/useIsRoundOver';
import { useRoundProgress } from '../../hooks/useRoundProgress';

const TopProgressBar: React.FC = () => {
  const roundPercentOver = useRoundProgress();
  const hasWinners = useIsRoundOver();

  // Don't show if round is over
  if (hasWinners) {
    return null;
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="overlay"
      display={{ base: 'block', md: 'none' }}
      height="2px"
      bg="transparent"
    >
      <Progress.Root
        value={roundPercentOver >= 100 ? null : roundPercentOver}
        size="xs"
        height="2px"
        colorPalette="blue"
      >
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
    </Box>
  );
};

export default TopProgressBar;
