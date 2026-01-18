import { Button, ButtonGroup, Stack, Text, Wrap } from '@chakra-ui/react';
import React, { useCallback } from 'react';
import { FaFillDrip, FaInfinity } from 'react-icons/fa6';

import { RoundState } from '../../../types';
import {
  useRoundStore,
  useRoundData,
  useBetStore,
  useBatchUpdateBetAmounts,
  useSelectedRound,
  useMaxBet,
} from '../../stores';
import { determineBetAmount, makeEmptyBetAmounts, isValidRound } from '../../util';

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
  const maxBet = useMaxBet();
  const maxBetDisplay = maxBet === -1000 ? '(currently unset)' : maxBet.toLocaleString();

  const setBetAmountsWithMode = useCallback(
    (capped: boolean): void => {
      const store = useBetStore.getState();
      const maxBetValue = maxBet;
      const currentBets = store.allBets.get(store.currentBet) ?? new Map();
      const currentAmounts = store.allBetAmounts.get(store.currentBet) ?? new Map();

      const updates: Array<{ betIndex: number; amount: number }> = [];

      // Get betOdds only if we need it for capped mode
      const betOdds = capped ? useRoundStore.getState().calculations.betOdds : null;

      for (const index of currentAmounts.keys()) {
        const bet = currentBets.get(index) ?? [];
        if (bet.some((pirate: number) => pirate > 0)) {
          if (capped && betOdds) {
            const amount = determineBetAmount(
              maxBetValue,
              Math.ceil(1_000_000 / (betOdds.get(index) ?? 1)),
            );
            updates.push({ betIndex: index, amount });
          } else {
            updates.push({ betIndex: index, amount: maxBetValue });
          }
        } else {
          updates.push({ betIndex: index, amount: -1000 });
        }
      }

      if (updates.length > 0) {
        batchUpdateBetAmounts(updates);
      }
    },
    [maxBet, batchUpdateBetAmounts],
  );

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

  const handleCapped = useCallback(() => setBetAmountsWithMode(true), [setBetAmountsWithMode]);
  const handleUncapped = useCallback(() => setBetAmountsWithMode(false), [setBetAmountsWithMode]);

  return (
    <>
      <Stack>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          letterSpacing="wide"
          textTransform="uppercase"
          color="fg.muted"
        >
          Set bet amounts
        </Text>
        <Wrap mt={1}>
          <Tooltip
            content={`Sets all bet amounts to whichever is lower: your max bet (${maxBetDisplay}), or the value in the MAXBET column below + 1. This prevents you from betting more than necessary to earn 1M NP from the bet, given the current odds.`}
            openDelay={600}
            placement="top"
          >
            <Button
              size="sm"
              layerStyle="fill.surface"
              colorPalette="green"
              onClick={handleCapped}
              data-testid="capped-bet-amounts-button"
              disabled={maxBet === -1000}
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
              onClick={handleUncapped}
              data-testid="uncapped-bet-amounts-button"
              disabled={maxBet === -1000}
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
