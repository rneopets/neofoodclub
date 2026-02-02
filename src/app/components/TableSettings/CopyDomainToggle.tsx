import { memo, useMemo, useCallback } from 'react';
import { FaGlobe } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useUseWebDomain, useSetUseWebDomain } from '../../stores';

import MobileSwitchBox from './MobileSwitchBox';

const CopyDomainToggle = memo(() => {
  const useWebDomain = useUseWebDomain();
  const setUseWebDomain = useSetUseWebDomain();

  const cookies = useMemo(() => new Cookies(), []);

  const handleChange = useCallback((): void => {
    const newValue = !useWebDomain;
    cookies.set('useWebDomain', newValue);
    setUseWebDomain(newValue);
  }, [useWebDomain, cookies, setUseWebDomain]);

  const tooltipLabel = 'Copy Domain With Bets';

  return (
    <MobileSwitchBox
      icon={FaGlobe}
      label={tooltipLabel}
      colorPalette="blue"
      checked={useWebDomain ?? false}
      onChange={handleChange}
      tooltipText={tooltipLabel}
    />
  );
});

CopyDomainToggle.displayName = 'CopyDomainToggle';

export default CopyDomainToggle;
