import { Button, ButtonGroup, Heading, Stack, Wrap } from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { FaFillDrip, FaInfinity } from 'react-icons/fa6';

import { RoundState } from '../../types';
import {
  useRoundStore,
  useRoundData,
  useBetStore,
  useBatchUpdateBetAmounts,
  useSelectedRound,
} from '../stores';
import { getMaxBet, determineBetAmount, makeEmptyBetAmounts, isValidRound } from '../util';

import { Tooltip } from '@/components/ui/tooltip';

interface BetAmountsButtonsProps {
  [key: string]: unknown;
}

const BetAmountsButtons = React.memo((props: BetAmountsButtonsProps): React.ReactElement => {
  const { ...rest } = props;
  const batchUpdateBetAmounts = useBatchUpdateBetAmounts();

  const currentBetAmountsSize = useBetStore(
    state => state.allBetAmounts.get(state.currentBet)?.size ?? 0,
  );

  const currentSelectedRound = useSelectedRound();
  const roundData = useRoundData();
  const hasRoundData = isValidRound({ roundData, currentSelectedRound } as RoundState);

  const maxBet = getMaxBet(currentSelectedRound);
  const maxBetDisplay = maxBet === -1000 ? '(currently unset)' : maxBet.toLocaleString();

  const setCappedBetAmounts = useCallback(() => {
    const store = useBetStore.getState();
    const maxBet = getMaxBet(currentSelectedRound);
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();

    const roundStore = useRoundStore.getState();
    const betOdds = roundStore.calculations.betOdds;
    const betBinaries = roundStore.calculations.betBinaries;

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
      batchUpdateBetAmounts(updates);
    }
  }, [currentSelectedRound, batchUpdateBetAmounts]);

  const setUncappedBetAmounts = useCallback(() => {
    const store = useBetStore.getState();
    const maxBet = getMaxBet(currentSelectedRound);
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();

    const roundStore = useRoundStore.getState();
    const betBinaries = roundStore.calculations.betBinaries;

    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const index of currentAmounts.keys()) {
      if ((betBinaries.get(index) ?? 0) > 0) {
        updates.push({ betIndex: index, amount: maxBet });
      } else {
        updates.push({ betIndex: index, amount: -1000 });
      }
    }

    if (updates.length > 0) {
      batchUpdateBetAmounts(updates);
    }
  }, [currentSelectedRound, batchUpdateBetAmounts]);

  const clearBetAmounts = useCallback(() => {
    const emptyBetAmounts = makeEmptyBetAmounts(currentBetAmountsSize);
    const updates: Array<{ betIndex: number; amount: number }> = [];
    emptyBetAmounts.forEach((amount, betIndex) => {
      updates.push({ betIndex, amount });
    });
    batchUpdateBetAmounts(updates);
  }, [currentBetAmountsSize, batchUpdateBetAmounts]);

  const incrementBetAmounts = useCallback(() => {
    const store = useBetStore.getState();
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();
    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const [index, amount] of currentAmounts.entries()) {
      if (amount === -1000) {
        // Bump -1000 to 0 before incrementing
        updates.push({ betIndex: index, amount: 2 });
      } else if (amount > 0) {
        updates.push({ betIndex: index, amount: amount + 2 });
      }
    }

    if (updates.length > 0) {
      batchUpdateBetAmounts(updates);
    }
  }, [batchUpdateBetAmounts]);

  const decrementBetAmounts = useCallback(() => {
    const store = useBetStore.getState();
    const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();
    const updates: Array<{ betIndex: number; amount: number }> = [];

    for (const [index, amount] of currentAmounts.entries()) {
      if (amount > 0) {
        updates.push({ betIndex: index, amount: amount - 2 });
      }
    }

    if (updates.length > 0) {
      batchUpdateBetAmounts(updates);
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
            content={`Sets all bet amounts to whichever is lower: your max bet (${maxBetDisplay}), or the value in the MAXBET column below + 1. This prevents you from betting more than necessary to earn 1M NP from the bet, given the current odds.`}
            openDelay={600}
            placement="top"
          >
            <Button
              size="sm"
              layerStyle="fill.surface"
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
            content={`Sets all bet amounts to your max bet (${maxBetDisplay}), regardless of overflow with the MAXBET column below. This is generally used by people who would like to maximize profits in the event of odds changing.`}
            openDelay={600}
            placement="top"
          >
            <Button
              size="sm"
              layerStyle="fill.surface"
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
            layerStyle="fill.surface"
            colorPalette="red"
            data-testid="clear-bet-amounts-button"
            {...rest}
          >
            Clear
          </Button>

          <ButtonGroup size="sm" colorPalette="purple">
            <Tooltip content="Increment all bet amounts by 2" openDelay={600} placement="top">
              <Button
                onClick={incrementBetAmounts}
                data-testid="increment-bet-amounts-button"
                disabled={!hasRoundData}
                layerStyle="fill.surface"
              >
                +2
              </Button>
            </Tooltip>

            <Tooltip content="Decrement all bet amounts by 2" openDelay={600} placement="top">
              <Button
                onClick={decrementBetAmounts}
                data-testid="decrement-bet-amounts-button"
                disabled={!hasRoundData}
                layerStyle="fill.surface"
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
