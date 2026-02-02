import { ChangeEvent, MouseEvent, memo, useMemo, useCallback } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import MobileSwitchBox from './MobileSwitchBox';

import { useColorMode } from '@/components/ui/color-mode';

const ColorModeToggle = memo(() => {
  const { colorMode, setColorMode } = useColorMode();
  const cookies = useMemo(() => new Cookies(), []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>): void => {
      const newMode = colorMode === 'light' ? 'dark' : 'light';
      setColorMode(newMode);
      cookies.set('colorMode', newMode);
    },
    [colorMode, setColorMode, cookies],
  );

  const isDarkMode = colorMode === 'dark';

  return (
    <MobileSwitchBox
      icon={!isDarkMode ? FaSun : FaMoon}
      label="Dark Mode"
      colorPalette="yellow"
      checked={isDarkMode}
      onChange={handleChange}
      tooltipText={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    />
  );
});

ColorModeToggle.displayName = 'ColorModeToggle';

export default ColorModeToggle;
