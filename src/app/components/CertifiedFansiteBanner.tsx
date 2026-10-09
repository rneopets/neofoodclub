import { Box, Button, Flex, Text } from '@chakra-ui/react';
import confetti from 'canvas-confetti';
import React from 'react';
import { FaCertificate } from 'react-icons/fa6';

const COMMON = { particleCount: 80, spread: 70, startVelocity: 55, ticks: 250, zIndex: 2000 };

const fireConfetti = (): void => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  // cannons from all four corners, angled toward the middle
  void confetti({ ...COMMON, angle: 60, origin: { x: 0, y: 1 } });
  void confetti({ ...COMMON, angle: 120, origin: { x: 1, y: 1 } });
  void confetti({ ...COMMON, angle: 300, origin: { x: 0, y: 0 } });
  void confetti({ ...COMMON, angle: 240, origin: { x: 1, y: 0 } });
};

export default React.memo(function CertifiedFansiteBanner(): React.ReactElement {
  return (
    <Box
      bgColor="yellow.solid"
      color="yellow.contrast"
      p={4}
      data-testid="certified-fansite-banner"
    >
      <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
        <Flex align="center" gap={2}>
          <FaCertificate />
          <Text>As of October 8th, NeoFoodClub is a certified Neopets fansite!</Text>
        </Flex>
        <Button size="sm" colorPalette="gray" variant="solid" onClick={fireConfetti}>
          Yay!
        </Button>
      </Flex>
    </Box>
  );
});
