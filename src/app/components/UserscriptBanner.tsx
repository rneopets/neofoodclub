import { Box, Button, Flex, Text } from '@chakra-ui/react';
import React from 'react';
import { FaCircleInfo, FaDownload, FaPuzzlePiece } from 'react-icons/fa6';

import { USERSCRIPT_URL } from '../constants';
import { useUserscriptModalStore } from '../stores/userscriptModalStore';

// not dismissable on purpose: placing bets from NeoFoodClub links needs the userscript
export default React.memo(function UserscriptBanner(): React.ReactElement {
  const open = useUserscriptModalStore(state => state.open);

  return (
    <Box bgColor="bg.emphasized" p={4} data-testid="userscript-banner">
      <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
        <Flex align="center" gap={2}>
          <FaPuzzlePiece />
          <Text>Placing bets from NeoFoodClub links now needs a userscript.</Text>
        </Flex>
        <Flex align="center" gap={2}>
          <Button size="sm" colorPalette="blue" variant="solid" onClick={open}>
            <FaCircleInfo /> What? Why?
          </Button>
          <Button size="sm" colorPalette="nfc-green" variant="surface" asChild>
            <a href={USERSCRIPT_URL} target="_blank" rel="noopener noreferrer">
              <FaDownload /> Install the userscript
            </a>
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
});
