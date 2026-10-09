import { Box, Button, Flex, Text } from '@chakra-ui/react';
import confetti from 'canvas-confetti';
import React from 'react';
import { FaCertificate } from 'react-icons/fa6';

const COMMON = { particleCount: 80, spread: 70, startVelocity: 55, ticks: 250, zIndex: 2000 };

const fireConfetti = (): void => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  // cannons from the bottom corners, angled toward the middle
  void confetti({ ...COMMON, angle: 60, origin: { x: 0, y: 1 } });
  void confetti({ ...COMMON, angle: 120, origin: { x: 1, y: 1 } });
};

export default React.memo(function CertifiedFansiteBanner(): React.ReactElement {
  return (
    <Box bgColor="bg.emphasized" p={4} data-testid="certified-fansite-banner">
      <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
        <Flex align="center" gap={2}>
          <FaCertificate />
          <Text>NeoFoodClub is now a certified Neopets fansite!</Text>
        </Flex>
        <Button size="sm" colorPalette="nfc-green" variant="solid" onClick={fireConfetti}>
          Yay!
        </Button>
      </Flex>
    </Box>
  );
});
