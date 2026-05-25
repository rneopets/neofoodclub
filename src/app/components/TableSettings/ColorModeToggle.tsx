import { Box, HStack, SegmentGroup, Spacer, Text } from '@chakra-ui/react';
import { memo, type ReactNode, useCallback, useMemo } from 'react';
import { FaMoon, FaRegMoon, FaSun } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { COLOR_MODES, type ColorMode, useColorMode } from '@/components/ui/color-mode';

interface ColorModeOption {
  value: ColorMode;
  label: ReactNode;
}

const ColorModeToggle = memo(() => {
  const { colorMode, setColorMode } = useColorMode();
  const cookies = useMemo(() => new Cookies(), []);
  const isNightMode = colorMode === 'night';
  const options: ColorModeOption[] = useMemo(
    () => [
      {
        value: 'light',
        label: (
          <HStack>
            <FaSun />
            Light
          </HStack>
        ),
      },
      {
        value: 'dark',
        label: (
          <HStack>
            <FaMoon />
            Dark
          </HStack>
        ),
      },
      {
        value: 'night',
        label: (
          <HStack>
            <FaRegMoon />
            Night
          </HStack>
        ),
      },
    ],
    [],
  );

  const handleChange = useCallback(
    ({ value }: { value: string }): void => {
      if (!COLOR_MODES.includes(value as ColorMode)) {
        return;
      }

      const nextMode = value as ColorMode;
      setColorMode(nextMode);
      cookies.set('colorMode', nextMode);
    },
    [setColorMode, cookies],
  );

  return (
    <HStack
      display="flex"
      width="full"
      layerStyle="fill.surface"
      px="2"
      py="2"
      rounded="l1"
      colorPalette="gray"
    >
      <FaMoon />
      <Text>Theme</Text>
      <Spacer />
      <Box flexShrink={0}>
        <SegmentGroup.Root
          value={colorMode}
          onValueChange={handleChange}
          size="sm"
          colorPalette={isNightMode ? 'purple' : 'gray'}
          css={{
            bg: 'bg.subtle',
            borderWidth: '1px',
            borderColor: isNightMode ? 'purple.border' : 'border',
            '& [data-state=unchecked]': {
              color: 'fg.muted',
            },
            '& [data-state=checked]': {
              color: isNightMode ? 'purple.fg' : 'fg',
              fontWeight: 'semibold',
            },
            '& [data-part=indicator]': {
              borderWidth: '1px',
              borderColor: isNightMode ? 'purple.focusRing' : 'border',
              bg: isNightMode ? 'purple.muted' : 'bg.emphasized',
              shadow: isNightMode ? 'md' : 'sm',
            },
          }}
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={options} />
        </SegmentGroup.Root>
      </Box>
    </HStack>
  );
});

ColorModeToggle.displayName = 'ColorModeToggle';

export default ColorModeToggle;
