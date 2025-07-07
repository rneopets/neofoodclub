import { Box } from '@chakra-ui/react';
import { memo, useMemo, useCallback } from 'react';
import { FaGlobe } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useRoundDataStore } from '../../stores';

import MobileSwitchBox from './MobileSwitchBox';
import SettingSwitch from './SettingSwitch';

const CopyDomainToggle = memo(() => {
  const useWebDomain = useRoundDataStore(state => state.roundState.useWebDomain);
  const setRoundState = useRoundDataStore(state => state.setRoundState);

  const cookies = useMemo(() => new Cookies(), []);

  const handleChange = useCallback((): void => {
    const newValue = !useWebDomain;
    cookies.set('useWebDomain', newValue);
    setRoundState({
      useWebDomain: newValue,
    });
  }, [useWebDomain, cookies, setRoundState]);

  const tooltipLabel = `Include domain when copying bets\n(${window.location.origin}/)`;

  return (
    <>
      {/* Mobile view */}
      <Box display={{ base: 'block', md: 'none' }}>
        <MobileSwitchBox
          icon={FaGlobe}
          label="Copy Domain"
          colorScheme="blue"
          isChecked={useWebDomain ?? false}
          onChange={handleChange}
          tooltipText={tooltipLabel}
        />
      </Box>

      {/* Desktop view */}
      <Box display={{ base: 'none', md: 'block' }}>
        <SettingSwitch
          icon={FaGlobe}
          color="blue"
          isChecked={useWebDomain ?? false}
          onChange={handleChange}
          tooltipLabel={tooltipLabel}
        />
      </Box>
    </>
  );
});

CopyDomainToggle.displayName = 'CopyDomainToggle';

export default CopyDomainToggle;
