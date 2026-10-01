import { memo, useMemo, useCallback } from 'react';
import { FaThumbtack } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useStickyPlaceBetButtons, useSetStickyPlaceBetButtons } from '../../stores';

import SettingsSwitch from './SettingsSwitch';

const StickyPlaceBetButtonsToggle = memo(() => {
  const stickyPlaceBetButtons = useStickyPlaceBetButtons();
  const setStickyPlaceBetButtons = useSetStickyPlaceBetButtons();

  const cookies = useMemo(() => new Cookies(), []);

  const persistStickyPlaceBetButtonsPreference = useCallback((): void => {
    const newValue = !stickyPlaceBetButtons;
    cookies.set('stickyPlaceBetButtons', newValue);
    setStickyPlaceBetButtons(newValue);
  }, [stickyPlaceBetButtons, cookies, setStickyPlaceBetButtons]);

  const tooltipLabel = 'Sticky Place Bet Buttons';

  return (
    <SettingsSwitch
      icon={FaThumbtack}
      label={tooltipLabel}
      colorPalette="nfc-blue"
      checked={stickyPlaceBetButtons ?? false}
      onChange={persistStickyPlaceBetButtonsPreference}
      tooltipText="Keep the Submit column pinned to the right edge of the table while scrolling horizontally."
    />
  );
});

StickyPlaceBetButtonsToggle.displayName = 'StickyPlaceBetButtonsToggle';

export default StickyPlaceBetButtonsToggle;
