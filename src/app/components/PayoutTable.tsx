import { Box, HStack, IconButton, Skeleton, Spacer, Table, Text } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa6';

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
import TextTooltip from './TextTooltip';

// this element is the colorful and informative table full of your bet data

const MemoizedTextTooltip = React.memo(
  ({ text, content }: { text: React.ReactNode; content?: string }) => (
    <TextTooltip text={text} {...(content && { content })} />
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

    return <Table.Cell backgroundColor={bgColor}>{pirateName}</Table.Cell>;
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
      <Table.Row key={betKey}>
        <Pd backgroundColor={betNumBgColor}>
          <HStack px={2} gap={1}>
            <Spacer />
            <Text>{betIndex + 1}</Text>

            {viewMode === false && (
              <>
                <Spacer />
                <HStack gap={1}>
                  <IconButton
                    size="xs"
                    height="20px"
                    onClick={handleSwapUp}
                    disabled={betIndex === 0}
                    aria-label="Move bet up"
                  >
                    <FaArrowUp />
                  </IconButton>
                  <IconButton
                    size="xs"
                    height="20px"
                    onClick={handleSwapDown}
                    disabled={betIndex === amountOfBets - 1}
                    aria-label="Move bet down"
                  >
                    <FaArrowDown />
                  </IconButton>
                </HStack>
              </>
            )}
            <Spacer />
          </HStack>
        </Pd>
        <Pd>
          <BetAmountInput
            betIndex={betIndex + 1}
            invalid={baBg !== 'transparent'}
            errorColor={baBg}
          />
        </Pd>
        <Table.Cell style={{ textAlign: 'end' }}>
          {odds?.toLocaleString() ?? '0'}
          :1
        </Table.Cell>
        <Table.Cell style={{ textAlign: 'end' }}>{payoffs?.toLocaleString() ?? '0'}</Table.Cell>
        <Table.Cell style={{ textAlign: 'end' }}>
          <MemoizedTextTooltip text={probabilityTooltip.text} content={probabilityTooltip.label} />
        </Table.Cell>
        <Table.Cell style={{ textAlign: 'end', backgroundColor: erBg }}>
          <MemoizedTextTooltip
            text={expectedRatioTooltip.text}
            content={expectedRatioTooltip.label}
          />
        </Table.Cell>
        <Table.Cell style={{ textAlign: 'end', backgroundColor: neBg }}>
          <MemoizedTextTooltip text={netExpectedTooltip.text} content={netExpectedTooltip.label} />
        </Table.Cell>
        <Table.Cell style={{ textAlign: 'end', backgroundColor: mbBg }}>
          {maxBets?.toLocaleString() ?? '0'}
        </Table.Cell>
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
        <Table.Cell>
          <PlaceThisBetButton bet={currentBetLine} betNum={betIndex + 1} />
        </Table.Cell>
      </Table.Row>
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
    <Table.Root size="sm" width="auto">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Bet #</Table.ColumnHeader>
          <Table.ColumnHeader>Amount</Table.ColumnHeader>
          <Table.ColumnHeader>Odds</Table.ColumnHeader>
          <Table.ColumnHeader>Payoff</Table.ColumnHeader>
          <Table.ColumnHeader>
            <TextTooltip text="Prob." content="Probability" />
          </Table.ColumnHeader>
          <Table.ColumnHeader>
            <TextTooltip text="E.R." content="Expected Ratio" />
          </Table.ColumnHeader>
          <Table.ColumnHeader>
            <TextTooltip text="N.E." content="Net Expected" />
          </Table.ColumnHeader>
          <Table.ColumnHeader>Maxbet</Table.ColumnHeader>
          <Table.ColumnHeader>Shipwreck</Table.ColumnHeader>
          <Table.ColumnHeader>Lagoon</Table.ColumnHeader>
          <Table.ColumnHeader>Treasure</Table.ColumnHeader>
          <Table.ColumnHeader>Hidden</Table.ColumnHeader>
          <Table.ColumnHeader>Harpoon</Table.ColumnHeader>
          <Table.ColumnHeader>Submit</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>

      {hasRoundData && calculated ? (
        <>
          <Table.Body>{tableRows}</Table.Body>
          <Table.Body>
            <Table.Row>
              <Table.ColumnHeader style={{ textAlign: 'end' }}>Total:</Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }}>
                {totalBetAmounts.toLocaleString()}
              </Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }}>
                {winningBetBinary > 0 && (
                  <Text>
                    {totalWinningOdds.toLocaleString()}:{totalEnabledBets}
                  </Text>
                )}
              </Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }}>
                {winningBetBinary > 0 && <Text>{totalWinningPayoff.toLocaleString()}</Text>}
              </Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }} />
              <Table.ColumnHeader style={{ textAlign: 'end' }}>
                <MemoizedTextTooltip
                  text={totalExpectedRatioTooltip.text}
                  content={totalExpectedRatioTooltip.label}
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }}>
                <MemoizedTextTooltip
                  text={totalNetExpectedTooltip.text}
                  content={totalNetExpectedTooltip.label}
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              <Table.ColumnHeader />
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Body>
        </>
      ) : (
        <Table.Body>
          {[...Array(amountOfBets)].map((_, index) => {
            // Create a stable key for skeleton rows that doesn't use array index
            const skeletonKey = `skeleton-${currentBet}-${index + 1}`;
            return (
              <Table.Row key={skeletonKey}>
                <Table.Cell colSpan={14}>
                  <Skeleton height="30px">
                    <Box>&nbsp;</Box>
                  </Skeleton>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      )}
    </Table.Root>
  );
});

PayoutTable.displayName = 'PayoutTable';

export default PayoutTable;
