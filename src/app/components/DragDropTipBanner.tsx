import { Box, CloseButton, Flex, Text } from '@chakra-ui/react';
import React, { useState } from 'react';
import { FaLightbulb } from 'react-icons/fa6';

import { useOtherTabHasBets } from '../hooks';
import { useHasAnyBets } from '../stores';

const DISMISSED_STORAGE_KEY = 'dragDropTipDismissed';

const readDismissed = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true';

export default React.memo(function DragDropTipBanner(): React.ReactElement | null {
  const anyBets = useHasAnyBets();
  const otherTabHasBets = useOtherTabHasBets();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!anyBets || !otherTabHasBets || dismissed) {
    return null;
  }

  const handleDismiss = (): void => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    }
    setDismissed(true);
  };

  return (
    <Box bgColor="bg.emphasized" p={4}>
      <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
        <Flex align="center" gap={2}>
          <FaLightbulb />
          <Text>
            Tip: in another tab, drag the link icon next to "Share:" onto this page to import that
            tab's bets here.
          </Text>
        </Flex>
        <CloseButton size="sm" onClick={handleDismiss} aria-label="Dismiss tip" />
      </Flex>
    </Box>
  );
});
