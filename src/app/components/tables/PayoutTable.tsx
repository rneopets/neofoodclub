import { Box, HStack, IconButton, Skeleton, Spacer, Table, Text } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa6';

import { PIRATE_NAMES } from '../../constants';
import { useGetPirateBgColor } from '../../hooks/useGetPirateBgColor';
import { computePirateBinary } from '../../maths';
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
  useCustomOddsValue,
  useCustomProbsValue,
  useCustomOddsMode,
  useRoundStore,
} from '../../stores';
import { displayAsPercent } from '../../util';
import BetAmountInput from '../bets/BetAmountInput';
import PlaceThisBetButton from '../bets/PlaceThisBetButton';
import TextTooltip from '../ui/TextTooltip';

import Td from './Td';

import { Tooltip } from '@/components/ui/tooltip';

// this element is the colorful and informative table full of your bet data

const MemoizedTextTooltip = React.memo(
  ({ text, content }: { text: React.ReactNode; content?: string }) => (
    <TextTooltip text={text} {...(content && { content })} />
  ),
);
MemoizedTextTooltip.displayName = 'MemoizedTextTooltip';

const stickySubmitColumnProps = {
  position: 'sticky',
  right: 0,
  zIndex: 1,
  bg: 'bg.panel',
  borderLeftWidth: '1px',
  borderLeftColor: 'border',
  boxShadow: '-8px 0 12px -12px rgba(0, 0, 0, 0.45)',
  minW: '8rem',
} as const;

const stickySubmitHeaderProps = {
  ...stickySubmitColumnProps,
  zIndex: 2,
} as const;

const PirateNameCell = React.memo(
  ({ arenaIndex, pirateIndex }: { arenaIndex: number; pirateIndex: number }) => {
    const getPirateBgColor = useGetPirateBgColor();
    const pirateId = usePirateId(arenaIndex, pirateIndex - 1);
    const pirateName = pirateId ? (PIRATE_NAMES.get(pirateId) ?? '') : '';
    const openingOdds = useOpeningOdds();
    const winningBetBinary = useWinningBetBinary();
    const customOddsMode = useCustomOddsMode();
    const customOddsValue = useCustomOddsValue(arenaIndex, pirateIndex);
    const customProbsValue = useCustomProbsValue(arenaIndex, pirateIndex);

    // Get original values for comparison
    const originalOdds = useRoundStore(
      state => state.roundData?.currentOdds?.[arenaIndex]?.[pirateIndex],
    );
    const useLogitModel = useRoundStore(state => state.useLogitModel);
    const originalProbs = useRoundStore(state => {
      if (useLogitModel) {
        return state.calculations.logitProbabilities?.used?.[arenaIndex]?.[pirateIndex];
      }
      return state.calculations.legacyProbabilities?.used?.[arenaIndex]?.[pirateIndex];
    });

    // Only show indicator if there's actually a pirate selected (pirateIndex > 0)
    // and the custom value differs from the original value
    const hasPirate = pirateIndex > 0 && pirateId !== undefined;
    const hasCustomOdds =
      hasPirate &&
      customOddsMode &&
      customOddsValue !== undefined &&
      originalOdds !== undefined &&
      customOddsValue !== originalOdds;
    const hasCustomProbs =
      hasPirate &&
      customOddsMode &&
      customProbsValue !== undefined &&
      originalProbs !== undefined &&
      Math.abs(customProbsValue - originalProbs) > 0.0001; // Use small epsilon for float comparison
    const hasModifications = hasCustomOdds || hasCustomProbs;

    let bgColor = undefined;
    const pirateBin = computePirateBinary(arenaIndex, pirateIndex);

    if (pirateBin > 0) {
      if (winningBetBinary > 0) {
        bgColor = (winningBetBinary & pirateBin) === pirateBin ? 'nfc-green' : 'nfc-red';
      } else {
        bgColor = getPirateBgColor(openingOdds[arenaIndex]![pirateIndex]!);
      }
    }

    const tooltipContent = useMemo(() => {
      if (!hasModifications) {
        return '';
      }
      const parts: string[] = [];
      if (hasCustomOdds) {
        parts.push('Custom odds');
      }
      if (hasCustomProbs) {
        parts.push('Custom probability');
      }
      return parts.join(', ');
    }, [hasModifications, hasCustomOdds, hasCustomProbs]);

    return (
      <Table.Cell {...(bgColor && { layerStyle: 'fill.subtle', colorPalette: bgColor })}>
        <HStack gap={1} display="inline-flex" alignItems="center">
          <Text>{pirateName}</Text>
          {hasModifications && (
            <Tooltip content={tooltipContent} placement="top">
              <Box
                as="span"
                w="6px"
                h="6px"
                borderRadius="full"
                bg="nfc-blue.solid"
                cursor="help"
                display="inline-block"
                flexShrink={0}
              />
            </Tooltip>
          )}
        </HStack>
      </Table.Cell>
    );
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
        label: displayAsPercent(probabilities),
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
        text: ne.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        label: ne.toString(),
      }),
      [ne],
    );

    const handleSwapUp = useCallback(() => onSwapUp(betIndex), [onSwapUp, betIndex]);
    const handleSwapDown = useCallback(() => onSwapDown(betIndex), [onSwapDown, betIndex]);

    if (betBinary === 0) {
      return null;
    }

    const erBg = er - 1 < 0 ? 'nfc-red' : undefined;
    const neBg = ne - 1 < 0 ? 'nfc-red' : undefined;

    let betNumBgColor = undefined;
    let maxBetColor = undefined;

    if (odds !== 0) {
      const div = 1_000_000 / odds;
      if (betAmount > Math.ceil(div)) {
        maxBetColor = 'nfc-orange';
      } else if (betAmount > Math.floor(div)) {
        maxBetColor = 'nfc-yellow';
      }
    }

    if (winningBetBinary > 0 && betBinary > 0) {
      betNumBgColor = (winningBetBinary & betBinary) === betBinary ? 'nfc-green' : 'nfc-red';
    }

    const mbBg = maxBetColor;

    const betKey = `bet-${currentBet}-${betIndex + 1}`;

    let baBg = undefined;
    if (betAmount > Math.ceil(maxBets) || betAmount > Math.floor(maxBets)) {
      baBg = 'border.warning';
    } else if (betAmount < 1) {
      baBg = 'border.error';
    }

    return (
      <Table.Row key={betKey}>
        <Td {...(betNumBgColor && { layerStyle: 'fill.subtle', colorPalette: betNumBgColor })}>
          <HStack px={2} gap={1}>
            <Spacer />
            <Text minW="2ch" textAlign="center">
              {betIndex + 1}
            </Text>

            {viewMode === false && (
              <>
                <Spacer />
                <HStack gap={1}>
                  <IconButton
                    size="2xs"
                    variant="subtle"
                    onClick={handleSwapUp}
                    disabled={betIndex === 0}
                    aria-label="Move bet up"
                  >
                    <FaArrowUp />
                  </IconButton>
                  <IconButton
                    size="2xs"
                    variant="subtle"
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
        </Td>
        <Td>
          <BetAmountInput
            betIndex={betIndex + 1}
            invalid={baBg !== undefined}
            {...(baBg && { errorColor: baBg })}
          />
        </Td>
        <Table.Cell style={{ textAlign: 'end' }}>
          {odds?.toLocaleString() ?? '0'}
          :1
        </Table.Cell>
        <Table.Cell style={{ textAlign: 'end' }}>{payoffs?.toLocaleString() ?? '0'}</Table.Cell>
        <Table.Cell style={{ textAlign: 'end' }}>
          <MemoizedTextTooltip text={probabilityTooltip.text} content={probabilityTooltip.label} />
        </Table.Cell>
        <Table.Cell
          style={{ textAlign: 'end' }}
          {...(erBg && { layerStyle: 'fill.subtle', colorPalette: erBg })}
        >
          <MemoizedTextTooltip
            text={expectedRatioTooltip.text}
            content={expectedRatioTooltip.label}
          />
        </Table.Cell>
        <Table.Cell
          style={{ textAlign: 'end' }}
          {...(neBg && { layerStyle: 'fill.subtle', colorPalette: neBg })}
        >
          <MemoizedTextTooltip text={netExpectedTooltip.text} content={netExpectedTooltip.label} />
        </Table.Cell>
        <Table.Cell
          style={{ textAlign: 'end' }}
          {...(mbBg && { layerStyle: 'fill.subtle', colorPalette: mbBg })}
        >
          {mbBg ? (
            <TextTooltip
              placement="top"
              text={maxBets?.toLocaleString() ?? '0'}
              content={
                mbBg === 'nfc-yellow'
                  ? 'Bet amount is 1 NP over maxbet'
                  : 'Bet amount is 2+ NP over maxbet'
              }
              cursor="help"
              textDecoration="underline dotted"
            />
          ) : (
            (maxBets?.toLocaleString() ?? '0')
          )}
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
        <Table.Cell {...stickySubmitColumnProps}>
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
      text: totalBetNetExpected.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      label: totalBetNetExpected.toString(),
    }),
    [totalBetNetExpected],
  );
  const totalErBg = totalBetExpectedRatios - 1 < 0 ? 'nfc-red' : undefined;
  const totalNeBg = totalBetNetExpected - 1 < 0 ? 'nfc-red' : undefined;

  return (
    <Table.Root size="sm" width="auto" interactive>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader w="3.5rem">Bet #</Table.ColumnHeader>
          <Table.ColumnHeader w="5rem">Amount</Table.ColumnHeader>
          <Table.ColumnHeader w="4rem">Odds</Table.ColumnHeader>
          <Table.ColumnHeader w="5rem">Payoff</Table.ColumnHeader>
          <Table.ColumnHeader w="4rem">
            <TextTooltip text="Prob." content="Probability" />
          </Table.ColumnHeader>
          <Table.ColumnHeader w="4.5rem">
            <TextTooltip text="E.R." content="Expected Ratio" />
          </Table.ColumnHeader>
          <Table.ColumnHeader w="5rem">
            <TextTooltip text="N.E." content="Net Expected" />
          </Table.ColumnHeader>
          <Table.ColumnHeader w="5rem">Maxbet</Table.ColumnHeader>
          <Table.ColumnHeader minW="5rem">Shipwreck</Table.ColumnHeader>
          <Table.ColumnHeader minW="5rem">Lagoon</Table.ColumnHeader>
          <Table.ColumnHeader minW="5rem">Treasure</Table.ColumnHeader>
          <Table.ColumnHeader minW="5rem">Hidden</Table.ColumnHeader>
          <Table.ColumnHeader minW="5rem">Harpoon</Table.ColumnHeader>
          <Table.ColumnHeader {...stickySubmitHeaderProps}>Submit</Table.ColumnHeader>
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
              <Table.ColumnHeader
                style={{ textAlign: 'end' }}
                {...(totalErBg && { layerStyle: 'fill.subtle', colorPalette: totalErBg })}
              >
                <MemoizedTextTooltip
                  text={totalExpectedRatioTooltip.text}
                  content={totalExpectedRatioTooltip.label}
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader
                style={{ textAlign: 'end' }}
                {...(totalNeBg && { layerStyle: 'fill.subtle', colorPalette: totalNeBg })}
              >
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
              <Table.ColumnHeader {...stickySubmitColumnProps} />
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
