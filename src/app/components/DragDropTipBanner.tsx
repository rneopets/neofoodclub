import { Box, CloseButton, Flex, Text } from '@chakra-ui/react';
import React, { useState } from 'react';
import { FaLightbulb } from 'react-icons/fa6';

import { useOtherTabHasBets } from '../hooks';
import { useHasAnyBets } from '../stores';

export default React.memo(function DragDropTipBanner(): React.ReactElement | null {
  const anyBets = useHasAnyBets();
  const otherTabHasBets = useOtherTabHasBets();
  const [dismissed, setDismissed] = useState(false);

  if (!anyBets || !otherTabHasBets || dismissed) {
    return null;
  }

  return (
    <Box bgColor="bg.emphasized" p={4}>
      <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
        <Flex align="center" gap={2}>
          <FaLightbulb />
          <Text>
            Tip: drag a bet link from another tab (or any site) onto this page to import it here.
          </Text>
        </Flex>
        <CloseButton size="sm" onClick={() => setDismissed(true)} aria-label="Dismiss tip" />
      </Flex>
    </Box>
  );
});
