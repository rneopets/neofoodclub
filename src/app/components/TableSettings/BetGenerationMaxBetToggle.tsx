import { HStack } from '@chakra-ui/react';
import React, { useCallback, useMemo, useRef } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useBetGenerationMaxBetMode, useSetBetGenerationMaxBetMode } from '../../stores';
import type { BetGenerationMaxBetMode } from '../../util';

import { SegmentedSettingsRow } from './SegmentedSettingsRow';

interface Option {
  value: BetGenerationMaxBetMode;
  label: React.ReactNode;
}

const BetGenerationMaxBetToggle = (): React.ReactElement => {
  const mode = useBetGenerationMaxBetMode();
  const setMode = useSetBetGenerationMaxBetMode();
  const cookiesRef = useRef(new Cookies());

  const options: Option[] = useMemo(
    () => [
      {
        value: 'capped',
        label: (
          <HStack>
            <FaLock />
            Capped
          </HStack>
        ),
      },
      {
        value: 'uncapped',
        label: (
          <HStack>
            <FaLockOpen />
            Uncapped
          </HStack>
        ),
      },
    ],
    [],
  );

  const persistMode = useCallback(
    (value: BetGenerationMaxBetMode): void => {
      setMode(value);
      cookiesRef.current.set('betGenerationMaxBetMode', value);
    },
    [setMode],
  );

  return (
    <SegmentedSettingsRow
      icon={FaLock}
      label="Bet Generation Max Bet"
      value={mode}
      options={options}
      onChange={persistMode}
      testId="bet-generation-max-bet-segmented-control"
    />
  );
};

export default React.memo(BetGenerationMaxBetToggle);
