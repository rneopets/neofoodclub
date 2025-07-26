import { Button, ButtonGroup, Heading, Stack, Wrap } from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { FaFillDrip, FaInfinity } from 'react-icons/fa6';

import { RoundState } from '../../types';
import {
  useUpdateBetAmounts,
  useCurrentBet,
  useRoundDataStore,
  useBetManagementStore,
  useBatchUpdateBetAmounts,
  useCalculationsStore,
  useSelectedRound,
} from '../stores';
import { getMaxBet, determineBetAmount, makeEmptyBetAmounts, isValidRound } from '../util';

import { Tooltip } from '@/components/ui/tooltip';

interface BetAmountsButtonsProps {
  [key: string]: unknown;
}

const BetAmountsButtons = React.memo((props: BetAmountsButtonsProps): React.ReactElement => {
  const { ...rest } = props;
  const updateBetAmounts = useUpdateBetAmounts();
  const batchUpdateBetAmounts = useBatchUpdateBetAmounts();
  const currentBet = useCurrentBet();

  const currentBetAmountsSize = useBetManagementStore(
    state => state.allBetAmounts.get(state.currentBet)?.size ?? 0,
  );

  const currentSelectedRound = useSelectedRound();
  const roundData = useRoundDataStore(state => state.roundState.roundData);
  const hasRoundData = isValidRound({ roundData, currentSelectedRound } as RoundState);

  const setCappedBetAmounts = useCallback(() => {
    const store = useBetManagementStore.getState();
    const maxBet = getMaxBet(currentSelectedRound);
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();

    const calculationsStore = useCalculationsStore.getState();
    const betOdds = calculationsStore.calculations.betOdds;
    const betBinaries = calculationsStore.calculations.betBinaries;

    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const index of currentAmounts.keys()) {
      if ((betBinaries.get(index) ?? 0) > 0) {
        const amount = determineBetAmount(maxBet, Math.ceil(1_000_000 / (betOdds.get(index) ?? 1)));
        updates.push({ betIndex: index, amount });
      } else {
        updates.push({ betIndex: index, amount: -1000 });
      }
    }

    if (updates.length > 0) {
      store.startBatchUpdate();

      batchUpdateBetAmounts(updates);

      setTimeout(() => {
        store.endBatchUpdate();
      }, 0);
    }
  }, [currentSelectedRound, batchUpdateBetAmounts]);

  const setUncappedBetAmounts = useCallback(() => {
    const store = useBetManagementStore.getState();
    const maxBet = getMaxBet(currentSelectedRound);
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();

    const calculationsStore = useCalculationsStore.getState();
    const betBinaries = calculationsStore.calculations.betBinaries;

    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const index of currentAmounts.keys()) {
      if ((betBinaries.get(index) ?? 0) > 0) {
        updates.push({ betIndex: index, amount: maxBet });
      } else {
        updates.push({ betIndex: index, amount: -1000 });
      }
    }

    if (updates.length > 0) {
      store.startBatchUpdate();

      batchUpdateBetAmounts(updates);

      setTimeout(() => {
        store.endBatchUpdate();
      }, 0);
    }
  }, [currentSelectedRound, batchUpdateBetAmounts]);

  const clearBetAmounts = useCallback(() => {
    const emptyBetAmounts = makeEmptyBetAmounts(currentBetAmountsSize);
    updateBetAmounts(currentBet, emptyBetAmounts);
  }, [currentBet, currentBetAmountsSize, updateBetAmounts]);

  const incrementBetAmounts = useCallback(() => {
    const store = useBetManagementStore.getState();
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();
    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const [index, amount] of currentAmounts.entries()) {
      if (amount > 0) {
        updates.push({ betIndex: index, amount: amount + 2 });
      }
    }

    if (updates.length > 0) {
      store.startBatchUpdate();

      batchUpdateBetAmounts(updates);

      setTimeout(() => {
        store.endBatchUpdate();
      }, 0);
    }
  }, [batchUpdateBetAmounts]);

  const decrementBetAmounts = useCallback(() => {
    const store = useBetManagementStore.getState();
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();
    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const [index, amount] of currentAmounts.entries()) {
      if (amount > 0) {
        updates.push({ betIndex: index, amount: amount - 2 });
      }
    }

    if (updates.length > 0) {
      store.startBatchUpdate();

      batchUpdateBetAmounts(updates);

      setTimeout(() => {
        store.endBatchUpdate();
      }, 0);
    }
  }, [batchUpdateBetAmounts]);

  return (
    <>
      <Stack>
        <Heading size="sm" textTransform="uppercase">
          Set bet amounts
        </Heading>
        <Wrap mt={2}>
          <Tooltip
            label="Sets all bet amounts to whichever is lower: your max bet amount, or the value in the MAXBET column below + 1. This prevents you from betting more than necessary to earn 1M NP from the bet, given the current odds."
            openDelay={600}
            placement="top"
          >
            <Button
              size="sm"
              colorPalette="green"
              onClick={setCappedBetAmounts}
              data-testid="capped-bet-amounts-button"
              {...rest}
            >
              <FaFillDrip style={{ width: '1.4em', height: '1.4em' }} />
              Capped
            </Button>
          </Tooltip>
          <Tooltip
            label="Sets all bet amounts your max bet, regardless of overflow with the MAXBET column below. This is generally used by people who would like to maximize profits in the event of odds changing."
            openDelay={600}
            placement="top"
          >
            <Button
              size="sm"
              colorPalette="blue"
              onClick={setUncappedBetAmounts}
              data-testid="uncapped-bet-amounts-button"
              {...rest}
            >
              <FaInfinity style={{ width: '1.4em', height: '1.4em' }} />
              Uncapped
            </Button>
          </Tooltip>
          <Button
            size="sm"
            onClick={clearBetAmounts}
            colorPalette="red"
            data-testid="clear-bet-amounts-button"
            {...rest}
          >
            Clear
          </Button>

          <ButtonGroup size="sm" colorPalette="purple">
            <Tooltip label="Increment all bet amounts by 2" openDelay={600} placement="top">
              <Button
                onClick={incrementBetAmounts}
                data-testid="increment-bet-amounts-button"
                disabled={!hasRoundData}
              >
                +2
              </Button>
            </Tooltip>

            <Tooltip label="Decrement all bet amounts by 2" openDelay={600} placement="top">
              <Button
                onClick={decrementBetAmounts}
                data-testid="decrement-bet-amounts-button"
                disabled={!hasRoundData}
              >
                -2
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Wrap>
      </Stack>
    </>
  );
});

BetAmountsButtons.displayName = 'BetAmountsButtons';

export default BetAmountsButtons;
