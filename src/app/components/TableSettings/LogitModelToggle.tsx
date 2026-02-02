import { memo, useMemo, useCallback } from 'react';
import { FaVial } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useLogitModelSetting, useToggleUseLogitModel, useTableMode } from '../../stores';

import MobileSwitchBox from './MobileSwitchBox';

const LogitModelToggle = memo(() => {
  const useLogitModel = useLogitModelSetting();
  const toggleUseLogitModel = useToggleUseLogitModel();
  const tableMode = useTableMode();

  const cookies = useMemo(() => new Cookies(), []);
  const isNormalMode = useMemo(() => tableMode === 'normal', [tableMode]);

  const handleChange = useCallback((): void => {
    const newValue = !useLogitModel;
    cookies.set('useLogitModel', newValue);
    toggleUseLogitModel();
  }, [useLogitModel, cookies, toggleUseLogitModel]);

  if (!isNormalMode) {
    return null;
  }

  return (
    <MobileSwitchBox
      icon={FaVial}
      label="Experimental Model"
      colorPalette="green"
      checked={useLogitModel ?? false}
      onChange={handleChange}
      tooltipText="The experimental model uses multinomial logit to predict the probabilities and should yield better TER, especially for smaller max bets."
    />
  );
});

LogitModelToggle.displayName = 'LogitModelToggle';

export default LogitModelToggle;
