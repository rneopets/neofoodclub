import { HStack } from '@chakra-ui/react';
import { type ReactElement, type ReactNode, useCallback, useMemo, useRef } from 'react';
import { FaArrowDown, FaArrowLeft, FaArrowRight, FaArrowUp } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useBetSetPosition, useSetBetSetPosition } from '../../stores';
import { BET_SET_POSITIONS, type BetSetPosition as BetSetPositionValue } from '../../util';

import { SegmentedSettingsRow } from './SegmentedSettingsRow';

interface Option {
  value: BetSetPositionValue;
  label: ReactNode;
}

const BetSetPosition = (): ReactElement => {
  const betSetPosition = useBetSetPosition();
  const setBetSetPosition = useSetBetSetPosition();
  const cookiesRef = useRef(new Cookies());

  const options: Option[] = useMemo(
    () => [
      {
        value: 'above',
        label: (
          <HStack>
            <FaArrowUp />
            Above
          </HStack>
        ),
      },
      {
        value: 'below',
        label: (
          <HStack>
            <FaArrowDown />
            Below
          </HStack>
        ),
      },
      {
        value: 'left',
        label: (
          <HStack>
            <FaArrowLeft />
            Left
          </HStack>
        ),
      },
      {
        value: 'right',
        label: (
          <HStack>
            <FaArrowRight />
            Right
          </HStack>
        ),
      },
    ],
    [],
  );

  const persistBetSetPosition = useCallback(
    (position: BetSetPositionValue): void => {
      if (!BET_SET_POSITIONS.includes(position)) {
        return;
      }

      setBetSetPosition(position);
      cookiesRef.current.set('betSetPosition', position);
    },
    [setBetSetPosition],
  );

  return (
    <SegmentedSettingsRow
      icon={FaArrowLeft}
      label="Bet Set Position"
      value={betSetPosition}
      options={options}
      onChange={persistBetSetPosition}
      testId="bet-set-position-segmented-control"
    />
  );
};

export default BetSetPosition;
