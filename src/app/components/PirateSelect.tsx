import { Select } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { PIRATE_NAMES, ARENA_NAMES } from '../constants';
import { useGetPirateBgColor } from '../hooks/useGetPirateBgColor';
import { usePiratesForArena, useRoundOpeningOdds } from '../stores';

interface PirateSelectProps {
  arenaId: number;
  pirateValue: number;
  showArenaName?: boolean;
  [key: string]: unknown;
}

const PirateSelect = React.memo(
  (props: PirateSelectProps): React.ReactElement => {
    const { arenaId, pirateValue, showArenaName = false, ...rest } = props;
    const getPirateBgColor = useGetPirateBgColor();

    // showArenaName will fill the arena name into the select option as a placeholder if set to true
    // only used this way for the bet builder tool.

    const openingOdds = useRoundOpeningOdds();

    const pirates = usePiratesForArena(arenaId);

    const pirateBg = useMemo(() => {
      let bg = 'transparent';
      const currentOpeningOdds = openingOdds[arenaId]?.[pirateValue] as number;

      if (currentOpeningOdds > 1) {
        bg = getPirateBgColor(currentOpeningOdds);
      }
      return bg;
    }, [openingOdds, pirateValue, getPirateBgColor, arenaId]);

    const useArenaName = showArenaName && pirateValue === 0;

    const selectOptions = useMemo(
      () =>
        pirates?.map((pirateId: number, pirateIndex: number) => {
          const bgColor = getPirateBgColor(openingOdds?.[arenaId]?.[pirateIndex + 1] as number);
          return (
            <option key={pirateId} style={{ background: bgColor }} value={pirateIndex + 1}>
              {PIRATE_NAMES.get(pirateId)}
            </option>
          );
        }),
      [pirates, openingOdds, getPirateBgColor, arenaId],
    );

    if (!pirates) {
      return <Select placeholder="Loading..." isDisabled {...rest} />;
    }

    return (
      <Select size="sm" height="1.5rem" backgroundColor={pirateBg} value={pirateValue} {...rest}>
        <option disabled={useArenaName} hidden={useArenaName} value="0">
          {useArenaName ? ARENA_NAMES[arenaId] : ''}
        </option>
        <option hidden={!useArenaName} value="0"></option>
        {selectOptions}
      </Select>
    );
  },
  // Custom comparison function - only re-render if relevant props change
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId &&
    prevProps.pirateValue === nextProps.pirateValue &&
    prevProps.showArenaName === nextProps.showArenaName,
);

PirateSelect.displayName = 'PirateSelect';

export default PirateSelect;
