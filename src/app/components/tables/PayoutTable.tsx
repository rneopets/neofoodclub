import { Box, HStack, IconButton, Skeleton, Spacer, Table, Text } from '@chakra-ui/react';
import { oklab, rgb, formatRgb, type Oklab } from 'culori';
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
  useBetProbabilities,
} from '../../stores';
import { displayAsPercent, displayAsPercentSmart, getMaxSmartPercentDecimals } from '../../util';
import BetAmountInput from '../bets/BetAmountInput';
import PlaceThisBetButton from '../bets/PlaceThisBetButton';
import AnimatedNumber from '../ui/AnimatedNumber';
import TextTooltip from '../ui/TextTooltip';
import { useTween } from '../ui/useTween';

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

const resolveSubtleColor = (colorKey: string | undefined): Oklab => {
  if (!colorKey || typeof window === 'undefined') {
    return { mode: 'oklab', l: 0, a: 0, b: 0, alpha: 0 };
  }
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(`--chakra-colors-${colorKey}-subtle`);
  return oklab(raw) ?? { mode: 'oklab', l: 0, a: 0, b: 0, alpha: 0 };
};

const lerpOklab = (from: Oklab, to: Oklab, t: number): Oklab => ({
  mode: 'oklab',
  l: (from.l ?? 0) + ((to.l ?? 0) - (from.l ?? 0)) * t,
  a: (from.a ?? 0) + ((to.a ?? 0) - (from.a ?? 0)) * t,
  b: (from.b ?? 0) + ((to.b ?? 0) - (from.b ?? 0)) * t,
  alpha: (from.alpha ?? 1) + ((to.alpha ?? 1) - (from.alpha ?? 1)) * t,
});

const oklabEqual = (x: Oklab, y: Oklab): boolean =>
  x.l === y.l && x.a === y.a && x.b === y.b && (x.alpha ?? 1) === (y.alpha ?? 1);

// Animates a cell's background color frame-by-frame in JS instead of via a
// CSS transition, which proved unreliable here: cells could get stuck
// showing a stale color after a round switch even though the DOM's computed
// style was already correct (a browser repaint bug), and workarounds that
// forced a repaint afterward either didn't fix it consistently or
// introduced their own visible glitches. Reuses the same tween mechanics
// AnimatedNumber uses for numbers.
//
// Interpolates in OKLab (a perceptually-uniform color space) rather than
// raw sRGB - a plain RGB lerp between e.g. nfc-green and nfc-red (a direct
// win-to-loss flip on the same bet slot) passes through a muddy tan/khaki
// midpoint, since red and green are near-opposite on the RGB cube.
function useBackgroundColorTween(colorKey: string | undefined, durationMs = 600): string {
  const target = useMemo(() => resolveSubtleColor(colorKey), [colorKey]);
  const displayed = useTween(target, { durationMs, interpolate: lerpOklab, isEqual: oklabEqual });
  return formatRgb(rgb(displayed));
}

const fillColorStyle = (
  backgroundColor: string,
  colorKey: string | undefined,
): React.CSSProperties => ({
  backgroundColor,
  color: colorKey ? `var(--chakra-colors-${colorKey}-fg)` : 'inherit',
});

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

    const bg = useBackgroundColorTween(bgColor);

    return (
      <Td className="nfc-color-tween" style={fillColorStyle(bg, bgColor)}>
        <HStack gap={1} display="inline-flex" alignItems="center">
          <Text>{pirateName}</Text>
          {hasModifications && (
            <Tooltip content={tooltipContent} placement="top">
              <Box
                as="span"
                w="6px"
                h="6px"
                borderRadius="full"
                bg="currentColor"
                cursor="help"
                display="inline-block"
                flexShrink={0}
              />
            </Tooltip>
          )}
        </HStack>
      </Td>
    );
  },
);

PirateNameCell.displayName = 'PirateNameCell';

const PayoutTableRow = React.memo(
  ({
    betIndex,
    onSwapUp,
    onSwapDown,
    probabilityDecimals,
  }: {
    betIndex: number;
    onSwapUp: (index: number) => void;
    onSwapDown: (index: number) => void;
    probabilityDecimals: number;
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
        text: (
          <AnimatedNumber
            value={probabilities}
            format={v => displayAsPercent(v, probabilityDecimals)}
          />
        ),
        label: displayAsPercentSmart(probabilities),
      }),
      [probabilities, probabilityDecimals],
    );

    const expectedRatioTooltip = useMemo(
      () => ({
        text: (
          <>
            <AnimatedNumber value={er} format={v => v.toFixed(3)} />
            :1
          </>
        ),
        label: er.toString(),
      }),
      [er],
    );

    const netExpectedTooltip = useMemo(
      () => ({
        text: (
          <AnimatedNumber
            value={ne}
            format={v =>
              v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }
          />
        ),
        label: ne.toString(),
      }),
      [ne],
    );

    const handleSwapUp = useCallback(() => onSwapUp(betIndex), [onSwapUp, betIndex]);
    const handleSwapDown = useCallback(() => onSwapDown(betIndex), [onSwapDown, betIndex]);

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

    // Hooks must run unconditionally before the betBinary===0 early return below.
    const betNumBgAnimated = useBackgroundColorTween(betNumBgColor);
    const erBgAnimated = useBackgroundColorTween(erBg);
    const neBgAnimated = useBackgroundColorTween(neBg);
    const mbBgAnimated = useBackgroundColorTween(mbBg);

    if (betBinary === 0) {
      return null;
    }

    const betKey = `bet-${currentBet}-${betIndex + 1}`;

    let baBg = undefined;
    if (betAmount > Math.ceil(maxBets) || betAmount > Math.floor(maxBets)) {
      baBg = 'border.warning';
    } else if (betAmount < 1) {
      baBg = 'border.error';
    }

    return (
      <Table.Row key={betKey}>
        <Td className="nfc-color-tween" style={fillColorStyle(betNumBgAnimated, betNumBgColor)}>
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
        <Td style={{ textAlign: 'end' }}>
          <AnimatedNumber value={odds ?? 0} precision={0} />
          :1
        </Td>
        <Td style={{ textAlign: 'end' }}>
          <AnimatedNumber value={payoffs ?? 0} precision={0} />
        </Td>
        <Td style={{ textAlign: 'end' }}>
          <MemoizedTextTooltip text={probabilityTooltip.text} content={probabilityTooltip.label} />
        </Td>
        <Td
          className="nfc-color-tween"
          style={{ textAlign: 'end', ...fillColorStyle(erBgAnimated, erBg) }}
        >
          <MemoizedTextTooltip
            text={expectedRatioTooltip.text}
            content={expectedRatioTooltip.label}
          />
        </Td>
        <Td
          className="nfc-color-tween"
          style={{ textAlign: 'end', ...fillColorStyle(neBgAnimated, neBg) }}
        >
          <MemoizedTextTooltip text={netExpectedTooltip.text} content={netExpectedTooltip.label} />
        </Td>
        <Td
          className="nfc-color-tween"
          style={{ textAlign: 'end', ...fillColorStyle(mbBgAnimated, mbBg) }}
        >
          {mbBg ? (
            <TextTooltip
              placement="top"
              text={<AnimatedNumber value={maxBets ?? 0} precision={0} />}
              content={
                mbBg === 'nfc-yellow'
                  ? 'Bet amount is 1 NP over maxbet'
                  : 'Bet amount is 2+ NP over maxbet'
              }
              cursor="help"
              textDecoration="underline dotted"
            />
          ) : (
            <AnimatedNumber value={maxBets ?? 0} precision={0} />
          )}
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
        <Td {...stickySubmitColumnProps}>
          <PlaceThisBetButton bet={currentBetLine} betNum={betIndex + 1} />
        </Td>
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
  const betProbabilities = useBetProbabilities();

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

  const probabilityDecimals = useMemo(
    () =>
      getMaxSmartPercentDecimals(
        Array.from({ length: amountOfBets }, (_, i) => betProbabilities.get(i + 1) ?? 0),
      ),
    [amountOfBets, betProbabilities],
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
          probabilityDecimals={probabilityDecimals}
        />,
      );
    }
    return rows;
  }, [amountOfBets, currentBet, handleSwapBetUp, handleSwapBetDown, probabilityDecimals]);

  const totalExpectedRatioTooltip = useMemo(
    () => ({
      text: <AnimatedNumber value={totalBetExpectedRatios} format={v => v.toFixed(3)} />,
      label: totalBetExpectedRatios.toString(),
    }),
    [totalBetExpectedRatios],
  );

  const totalNetExpectedTooltip = useMemo(
    () => ({
      text: (
        <AnimatedNumber
          value={totalBetNetExpected}
          format={v =>
            v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
        />
      ),
      label: totalBetNetExpected.toString(),
    }),
    [totalBetNetExpected],
  );
  const totalErBg = totalBetExpectedRatios - 1 < 0 ? 'nfc-red' : undefined;
  const totalNeBg = totalBetNetExpected - 1 < 0 ? 'nfc-red' : undefined;
  const totalErBgAnimated = useBackgroundColorTween(totalErBg);
  const totalNeBgAnimated = useBackgroundColorTween(totalNeBg);

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
                    <AnimatedNumber value={totalWinningOdds} precision={0} />:{totalEnabledBets}
                  </Text>
                )}
              </Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }}>
                {winningBetBinary > 0 && (
                  <Text>
                    <AnimatedNumber value={totalWinningPayoff} precision={0} />
                  </Text>
                )}
              </Table.ColumnHeader>
              <Table.ColumnHeader style={{ textAlign: 'end' }} />
              <Table.ColumnHeader
                className="nfc-color-tween"
                style={{ textAlign: 'end', ...fillColorStyle(totalErBgAnimated, totalErBg) }}
              >
                <MemoizedTextTooltip
                  text={totalExpectedRatioTooltip.text}
                  content={totalExpectedRatioTooltip.label}
                />
              </Table.ColumnHeader>
              <Table.ColumnHeader
                className="nfc-color-tween"
                style={{ textAlign: 'end', ...fillColorStyle(totalNeBgAnimated, totalNeBg) }}
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
