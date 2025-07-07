import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons';
import {
  Box,
  HStack,
  IconButton,
  Skeleton,
  Spacer,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';

import { PIRATE_NAMES } from '../constants';
import { useGetPirateBgColor } from '../hooks/useGetPirateBgColor';
import { computePirateBinary } from '../maths';
import {
  useCurrentBet,
  useSpecificBetAmount,
  useBetLineSpecific,
  useCalculationsStatus,
  useWinningBetBinary,
  useTotalBetAmounts,
  useTotalBetExpectedRatios,
  useTotalBetNetExpected,
  useTotalWinningOdds,
  useTotalWinningPayoff,
  useTotalEnabledBets,
  useBetCount,
  useSpecificBetOdds,
  useSpecificBetPayoff,
  useSpecificBetProbability,
  useSpecificBetBinary,
  useSpecificBetExpectedRatio,
  useSpecificBetNetExpected,
  useSpecificBetMaxBet,
  useHasRoundData,
  usePirateId,
  useOpeningOdds,
  useViewMode,
  useSwapBets,
} from '../stores';
import { displayAsPercent, useTableColors } from '../util';

import BetAmountInput from './BetAmountInput';
import Pd from './Pd';
import PlaceThisBetButton from './PlaceThisBetButton';
import Td from './Td';
import TextTooltip from './TextTooltip';

// this element is the colorful and informative table full of your bet data

const MemoizedTextTooltip = React.memo(
  ({ text, label }: { text: React.ReactNode; label?: string }) => (
    <TextTooltip text={text} {...(label && { label })} />
  ),
);
MemoizedTextTooltip.displayName = 'MemoizedTextTooltip';

const PirateNameCell = React.memo(
  ({ arenaIndex, pirateIndex }: { arenaIndex: number; pirateIndex: number }) => {
    const colors = useTableColors();
    const getPirateBgColor = useGetPirateBgColor();
    const pirateId = usePirateId(arenaIndex, pirateIndex - 1);
    const pirateName = pirateId ? (PIRATE_NAMES.get(pirateId) ?? '') : '';
    const openingOdds = useOpeningOdds(arenaIndex, pirateIndex - 1);
    const winningBetBinary = useWinningBetBinary();

    let bgColor = 'transparent';
    const pirateBin = computePirateBinary(arenaIndex, pirateIndex);

    if (pirateBin > 0) {
      if (winningBetBinary) {
        bgColor = (winningBetBinary & pirateBin) === pirateBin ? colors.green : colors.red;
      } else {
        bgColor = getPirateBgColor(openingOdds);
      }
    }

    return <Td backgroundColor={bgColor}>{pirateName}</Td>;
  },
);

PirateNameCell.displayName = 'PirateNameCell';

const PayoutTableRow = React.memo(
  ({
    betIndex,
    onSwapUp,
    onSwapDown,
  }: {
    betIndex: number;
    onSwapUp: (index: number) => void;
    onSwapDown: (index: number) => void;
  }) => {
    const colors = useTableColors();
    const viewMode = useViewMode();
    const winningBetBinary = useWinningBetBinary();
    const currentBet = useCurrentBet();
    const amountOfBets = useBetCount();

    const betAmount = useSpecificBetAmount(betIndex + 1);
    const currentBetLine = useBetLineSpecific(betIndex + 1);

    const odds = useSpecificBetOdds(betIndex + 1);
    const payoffs = useSpecificBetPayoff(betIndex + 1);
    const probabilities = useSpecificBetProbability(betIndex + 1);
    const betBinary = useSpecificBetBinary(betIndex + 1);
    const expectedRatios = useSpecificBetExpectedRatio(betIndex + 1);
    const netExpected = useSpecificBetNetExpected(betIndex + 1);
    const maxBets = useSpecificBetMaxBet(betIndex + 1);

    const er = expectedRatios;
    const ne = netExpected;

    const probabilityTooltip = useMemo(
      () => ({
        text: displayAsPercent(probabilities, 3),
        label: displayAsPercent(probabilities, 2),
      }),
      [probabilities],
    );

    const expectedRatioTooltip = useMemo(
      () => ({
        text: `${er.toFixed(3)}:1`,
        label: er.toString(),
      }),
      [er],
    );

    const netExpectedTooltip = useMemo(
      () => ({
        text: ne.toFixed(2).toLocaleString(),
        label: ne.toString(),
      }),
      [ne],
    );

    const handleSwapUp = useCallback(() => onSwapUp(betIndex), [onSwapUp, betIndex]);
    const handleSwapDown = useCallback(() => onSwapDown(betIndex), [onSwapDown, betIndex]);

    if (betBinary === 0) {
      return null;
    }

    const erBg = er - 1 < 0 ? colors.red : 'transparent';
    const neBg = ne - 1 < 0 ? colors.red : 'transparent';

    let betNumBgColor = 'transparent';
    let maxBetColor = 'transparent';

    if (odds !== 0) {
      const div = 1_000_000 / odds;
      if (betAmount > Math.ceil(div)) {
        maxBetColor = colors.orange;
      } else if (betAmount > Math.floor(div)) {
        maxBetColor = colors.yellow;
      }
    }

    if (winningBetBinary > 0 && betBinary > 0) {
      betNumBgColor = (winningBetBinary & betBinary) === betBinary ? colors.green : colors.red;
    }

    const mbBg = maxBetColor;

    const betKey = `bet-${currentBet}-${betIndex + 1}`;

    let baBg = 'transparent';
    if (betAmount > Math.ceil(maxBets)) {
      baBg = colors.orange;
    } else if (betAmount > Math.floor(maxBets)) {
      baBg = colors.yellow;
    } else if (betAmount < 1) {
      baBg = colors.red;
    }

    return (
      <Tr key={betKey}>
        <Pd backgroundColor={betNumBgColor}>
          <HStack px={2} gap={1}>
            <Spacer />
            <Text>{betIndex + 1}</Text>

            {viewMode === false && (
              <>
                <Spacer />
                <HStack spacing="1px">
                  <IconButton
                    size="xs"
                    height="20px"
                    icon={<ArrowUpIcon />}
                    onClick={handleSwapUp}
                    isDisabled={betIndex === 0}
                    aria-label="Move bet up"
                  />
                  <IconButton
                    size="xs"
                    height="20px"
                    icon={<ArrowDownIcon />}
                    onClick={handleSwapDown}
                    isDisabled={betIndex === amountOfBets - 1}
                    aria-label="Move bet down"
                  />
                </HStack>
              </>
            )}
            <Spacer />
          </HStack>
        </Pd>
        <Pd>
          <BetAmountInput
            betIndex={betIndex + 1}
            isInvalid={baBg !== 'transparent'}
            errorBorderColor={baBg}
          />
        </Pd>
        <Td isNumeric>
          {odds?.toLocaleString() ?? '0'}
          :1
        </Td>
        <Td isNumeric>{payoffs?.toLocaleString() ?? '0'}</Td>
        <Td isNumeric>
          <MemoizedTextTooltip text={probabilityTooltip.text} label={probabilityTooltip.label} />
        </Td>
        <Td isNumeric backgroundColor={erBg}>
          <MemoizedTextTooltip
            text={expectedRatioTooltip.text}
            label={expectedRatioTooltip.label}
          />
        </Td>
        <Td isNumeric backgroundColor={neBg}>
          <MemoizedTextTooltip text={netExpectedTooltip.text} label={netExpectedTooltip.label} />
        </Td>
        <Td isNumeric backgroundColor={mbBg}>
          {maxBets?.toLocaleString() ?? '0'}
        </Td>
        {[0, 1, 2, 3, 4].map(arenaIndex => {
          const pirateIndex = currentBetLine[arenaIndex] as number;
          return (
            <PirateNameCell
              key={`payout-pirate-cell-${arenaIndex}-${pirateIndex}`}
              arenaIndex={arenaIndex}
              pirateIndex={pirateIndex}
            />
          );
        })}
        <Td>
          <PlaceThisBetButton bet={currentBetLine} betNum={betIndex + 1} />
        </Td>
      </Tr>
    );
  },
);

PayoutTableRow.displayName = 'PayoutTableRow';

const PayoutTable = React.memo((): React.ReactElement => {
  const hasRoundData = useHasRoundData();

  const calculated = useCalculationsStatus();
  const winningBetBinary = useWinningBetBinary();

  // Use individual hooks instead of object selector to avoid infinite loops
  const totalBetAmounts = useTotalBetAmounts();
  const totalBetExpectedRatios = useTotalBetExpectedRatios();
  const totalBetNetExpected = useTotalBetNetExpected();
  const totalWinningOdds = useTotalWinningOdds();
  const totalWinningPayoff = useTotalWinningPayoff();
  const totalEnabledBets = useTotalEnabledBets();

  const currentBet = useCurrentBet();
  const amountOfBets = useBetCount();

  const swapBets = useSwapBets();

  const handleSwapBetUp = useCallback(
    (index: number): void => {
      if (index > 0) {
        swapBets(index, index - 1);
      }
    },
    [swapBets],
  );

  const handleSwapBetDown = useCallback(
    (index: number): void => {
      if (index < amountOfBets - 1) {
        swapBets(index, index + 1);
      }
    },
    [swapBets, amountOfBets],
  );

  const tableRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < amountOfBets; i++) {
      rows.push(
        <PayoutTableRow
          key={`bet-${currentBet}-${i + 1}`}
          betIndex={i}
          onSwapUp={handleSwapBetUp}
          onSwapDown={handleSwapBetDown}
        />,
      );
    }
    return rows;
  }, [amountOfBets, currentBet, handleSwapBetUp, handleSwapBetDown]);

  const totalExpectedRatioTooltip = useMemo(
    () => ({
      text: totalBetExpectedRatios.toFixed(3),
      label: totalBetExpectedRatios.toString(),
    }),
    [totalBetExpectedRatios],
  );

  const totalNetExpectedTooltip = useMemo(
    () => ({
      text: totalBetNetExpected.toFixed(2).toLocaleString(),
      label: totalBetNetExpected.toString(),
    }),
    [totalBetNetExpected],
  );

  return (
    <Table size="sm" width="auto">
      <Thead>
        <Tr>
          <Th>Bet #</Th>
          <Th>Amount</Th>
          <Th>Odds</Th>
          <Th>Payoff</Th>
          <Th>
            <TextTooltip text="Prob." label="Probability" />
          </Th>
          <Th>
            <TextTooltip text="E.R." label="Expected Ratio" />
          </Th>
          <Th>
            <TextTooltip text="N.E." label="Net Expected" />
          </Th>
          <Th>Maxbet</Th>
          <Th>Shipwreck</Th>
          <Th>Lagoon</Th>
          <Th>Treasure</Th>
          <Th>Hidden</Th>
          <Th>Harpoon</Th>
          <Th>Submit</Th>
        </Tr>
      </Thead>

      {hasRoundData && calculated ? (
        <>
          <Tbody>{tableRows}</Tbody>
          <Tbody>
            <Tr>
              <Th isNumeric>Total:</Th>
              <Th isNumeric>{totalBetAmounts.toLocaleString()}</Th>
              <Th isNumeric>
                {winningBetBinary > 0 && (
                  <Text>
                    {totalWinningOdds.toLocaleString()}:{totalEnabledBets}
                  </Text>
                )}
              </Th>
              <Th isNumeric>
                {winningBetBinary > 0 && <Text>{totalWinningPayoff.toLocaleString()}</Text>}
              </Th>
              <Th />
              <Th isNumeric>
                <MemoizedTextTooltip
                  text={totalExpectedRatioTooltip.text}
                  label={totalExpectedRatioTooltip.label}
                />
              </Th>
              <Th isNumeric>
                <MemoizedTextTooltip
                  text={totalNetExpectedTooltip.text}
                  label={totalNetExpectedTooltip.label}
                />
              </Th>
              <Th />
              <Th />
              <Th />
              <Th />
              <Th />
              <Th />
              <Th />
            </Tr>
          </Tbody>
        </>
      ) : (
        <Tbody>
          {[...Array(amountOfBets)].map((_, index) => {
            // Create a stable key for skeleton rows that doesn't use array index
            const skeletonKey = `skeleton-${currentBet}-${index + 1}`;
            return (
              <Tr key={skeletonKey}>
                <Td colSpan={14}>
                  <Skeleton height="30px">
                    <Box>&nbsp;</Box>
                  </Skeleton>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      )}
    </Table>
  );
});

PayoutTable.displayName = 'PayoutTable';

export default PayoutTable;
