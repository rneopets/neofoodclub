import { NativeSelect } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { PIRATE_NAMES, ARENA_NAMES } from '../constants';
import { useGetPirateBgColor } from '../hooks/useGetPirateBgColor';
import { usePiratesForArena, useRoundOpeningOdds } from '../stores';

interface PirateSelectProps {
  arenaId: number;
  pirateValue: number;
  showArenaName?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  [key: string]: unknown;
}

const PirateSelect = React.memo(
  (props: PirateSelectProps): React.ReactElement => {
    const { arenaId, pirateValue, showArenaName = false, onChange, ...rest } = props;
    const getPirateBgColor = useGetPirateBgColor();

    // showArenaName will fill the arena name into the select option as a placeholder if set to true
    // only used this way for the bet builder tool.

    const openingOdds = useRoundOpeningOdds();

    const pirates = usePiratesForArena(arenaId);

    const currentOpeningOdds = openingOdds[arenaId]?.[pirateValue] as number;

    const bgColor = pirateValue !== 0 ? getPirateBgColor(currentOpeningOdds) : undefined;

    const useArenaName = showArenaName && pirateValue === 0;

    const selectOptions = useMemo(
      () =>
        pirates?.map((pirateId: number, pirateIndex: number) => (
          <option key={pirateId} value={pirateIndex + 1}>
            {PIRATE_NAMES.get(pirateId)}
          </option>
        )),
      [pirates],
    );

    if (!pirates) {
      return (
        <NativeSelect.Root disabled {...rest}>
          <NativeSelect.Field placeholder="Loading..." />
        </NativeSelect.Root>
      );
    }

    return (
      <NativeSelect.Root size="xs" {...rest}>
        <NativeSelect.Field value={pirateValue} onChange={onChange} bg={bgColor}>
          <option disabled={useArenaName} hidden={useArenaName} value="0">
            {useArenaName ? ARENA_NAMES[arenaId] : ''}
          </option>
          <option hidden={!useArenaName} value="0"></option>
          {selectOptions}
        </NativeSelect.Field>
        <NativeSelect.Indicator color="fg" />
      </NativeSelect.Root>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId &&
    prevProps.pirateValue === nextProps.pirateValue &&
    prevProps.showArenaName === nextProps.showArenaName &&
    prevProps.onChange === nextProps.onChange,
);

PirateSelect.displayName = 'PirateSelect';

export default PirateSelect;
