import { Box } from '@chakra-ui/react';
import { memo, useMemo, useCallback } from 'react';
import { FaGlobe } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useUseWebDomain, useSetUseWebDomain } from '../../stores';

import MobileSwitchBox from './MobileSwitchBox';
import ToolbarButton from './ToolbarButton';

const CopyDomainToggle = memo(() => {
  const useWebDomain = useUseWebDomain();
  const setUseWebDomain = useSetUseWebDomain();

  const cookies = useMemo(() => new Cookies(), []);

  const handleChange = useCallback((): void => {
    const newValue = !useWebDomain;
    cookies.set('useWebDomain', newValue);
    setUseWebDomain(newValue);
  }, [useWebDomain, cookies, setUseWebDomain]);

  const tooltipLabel = 'Copy Domain';

  return (
    <>
      {/* Mobile view */}
      <Box display={{ base: 'block', md: 'none' }}>
        <MobileSwitchBox
          icon={FaGlobe}
          label="Copy Domain"
          colorPalette="blue"
          checked={useWebDomain ?? false}
          onChange={handleChange}
          tooltipText={`Include domain when copying bets\n(${window.location.origin}/)`}
        />
      </Box>

      {/* Desktop view */}
      <Box display={{ base: 'none', md: 'block' }}>
        <ToolbarButton
          icon={FaGlobe}
          colorPalette="blue"
          isActive={useWebDomain ?? false}
          onChange={handleChange}
          tooltipLabel={tooltipLabel}
        />
      </Box>
    </>
  );
});

CopyDomainToggle.displayName = 'CopyDomainToggle';

export default CopyDomainToggle;
