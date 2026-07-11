import { Box, CloseButton, Flex, Text } from '@chakra-ui/react';
import React, { useState } from 'react';

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
        <Text>Tip: you can drag a bet link from another tab into this one to import it.</Text>
        <CloseButton size="sm" onClick={() => setDismissed(true)} aria-label="Dismiss tip" />
      </Flex>
    </Box>
  );
});
