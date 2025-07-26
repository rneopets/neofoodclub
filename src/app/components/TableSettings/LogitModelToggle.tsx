import { Box } from '@chakra-ui/react';
import { memo, useMemo, useCallback } from 'react';
import { FaVial } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useLogitModelSetting, useToggleUseLogitModel } from '../../stores';

import MobileSwitchBox from './MobileSwitchBox';
import SettingSwitch from './SettingSwitch';

const LogitModelToggle = memo(() => {
  const useLogitModel = useLogitModelSetting();
  const toggleUseLogitModel = useToggleUseLogitModel();

  const cookies = useMemo(() => new Cookies(), []);

  const handleChange = useCallback((): void => {
    const newValue = !useLogitModel;
    cookies.set('useLogitModel', newValue);
    toggleUseLogitModel();
  }, [useLogitModel, cookies, toggleUseLogitModel]);

  const tooltipLabel =
    'The experimental model uses multinomial logit to predict the probabilities and should yield better TER, especially for smaller max bets.';

  return (
    <>
      {/* Mobile view */}
      <Box display={{ base: 'block', md: 'none' }}>
        <MobileSwitchBox
          icon={FaVial}
          label="Experimental Model"
          colorPalette="green"
          checked={useLogitModel ?? false}
          onChange={handleChange}
          tooltipText={tooltipLabel}
        />
      </Box>

      {/* Desktop view */}
      <Box display={{ base: 'none', md: 'block' }}>
        <SettingSwitch
          icon={FaVial}
          colorPalette="green"
          checked={useLogitModel ?? false}
          onChange={handleChange}
          tooltipLabel={tooltipLabel}
        />
      </Box>
    </>
  );
});

LogitModelToggle.displayName = 'LogitModelToggle';

export default LogitModelToggle;
