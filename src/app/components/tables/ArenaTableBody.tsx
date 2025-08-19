import { Box, Button, Center, Icon, Skeleton, Table, Text, VStack } from '@chakra-ui/react';
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa6';

import {
  PIRATE_NAMES,
  FULL_PIRATE_NAMES,
  POSITIVE_FAS,
  NEGATIVE_FAS,
  ARENA_NAMES,
  FOODS,
} from '../../constants';
import { useBgColors } from '../../hooks/useBgColors';
import { useGetPirateBgColor } from '../../hooks/useGetPirateBgColor';
import { computePirateBinary } from '../../maths';
import {
  usePiratesForArena,
  useArenaRatios,
  useOddsTimeline,
  useBigBrain,
  useLogitModelSetting,
  useFoodsForArena,
  useBetCount,
  usePirateId,
  useOpeningOdds,
  useCurrentOdds,
  useWinningBetBinary,
  useStableUsedProbability,
  useStableLogitProbability,
  useStableLegacyProbabilityMin,
  useStableLegacyProbabilityMax,
  useStableLegacyProbabilityStd,
  useStablePirateFA,
  useCustomOddsMode,
  useFaDetails,
} from '../../stores';
import { displayAsPercent } from '../../util';
import BetRadio, { ClearRadio } from '../BetRadio';
import CustomOddsInput from '../CustomOddsInput';
import CustomProbsInput from '../CustomProbsInput';
import FaDetailsElement from '../FaDetailsElement';
import OddsTimeline from '../OddsTimeline';
import Pd from '../Pd';
import TextTooltip from '../TextTooltip';

// Component to show Food Adjustment for a pirate and food
const PirateFA = React.memo(
  (props: { pirateId: number; foodId: number }): React.ReactElement | null => {
    const { pirateId, foodId } = props;
    // returns the FA <td> element for the associated pirate/food

    const pos = POSITIVE_FAS[pirateId]![foodId]!;
    const neg = NEGATIVE_FAS[pirateId]![foodId]!;

    // by default, transparent + empty string if FA is 0
    let bgColor = 'transparent';
    let fgColor = 'fg.emphasized';
    let indicator = '';

    if (pos && neg) {
      bgColor = 'yellow.emphasized';
      fgColor = 'yellow.contrast';
      indicator = `+${pos}/-${neg}`;
    } else if (pos) {
      bgColor = 'green.solid';
      indicator = `+${pos}`;
    } else if (neg) {
      bgColor = 'red.solid';
      indicator = `-${neg}`;
    }

    return (
      <FaDetailsElement
        key={`fa-${foodId}-pirate-${pirateId}`}
        as={Pd}
        textAlign="end"
        backgroundColor={bgColor}
        color={fgColor}
        whiteSpace="nowrap"
      >
        <Text as={'b'}>{indicator}</Text>
      </FaDetailsElement>
    );
  },
);

PirateFA.displayName = 'PirateFA';

// A sticky Td component for the first column
const StickyTd = React.memo(
  (props: React.ComponentProps<typeof Table.Cell> & { cursor?: string }): React.ReactElement => {
    const { children, onClick, cursor = undefined, ...rest } = props;
    const [isStuck, setIsStuck] = useState(false);
    const tdRef = useRef<HTMLTableCellElement>(null);

    useEffect(() => {
      const element = tdRef.current;
      if (!element) {
        return;
      }

      const checkPosition = (): void => {
        const rect = element.getBoundingClientRect();
        // Element is stuck when its left position is at or very close to 0
        setIsStuck(rect.left <= 1);
      };

      // Check on scroll using requestAnimationFrame for better performance
      let rafId: number;
      const handleScroll = (): void => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
        rafId = window.requestAnimationFrame(checkPosition);
      };

      // Listen to all scroll events
      window.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });

      // Find and listen to the scrollable container
      let current = element.parentElement;
      while (current) {
        current.addEventListener('scroll', handleScroll, { passive: true });
        current = current.parentElement;
      }

      // Initial check
      checkPosition();

      return (): void => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('scroll', handleScroll);

        // Remove listeners from parent elements
        let currentCleanup = element.parentElement;
        while (currentCleanup) {
          currentCleanup.removeEventListener('scroll', handleScroll);
          currentCleanup = currentCleanup.parentElement;
        }
      };
    }, []);

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const filteredRest = Object.fromEntries(
      Object.entries(rest).filter(([_, value]) => value !== undefined),
    );

    const tdProps: React.ComponentProps<typeof Table.Cell> = {
      ref: tdRef,
      style: {
        position: 'sticky',
        left: '0',
      } as React.CSSProperties,
      zIndex: 1,
      ...(cursor && { cursor }),
      onClick,
      _after: {
        content: '""',
        position: 'absolute',
        top: 0,
        right: '-10px',
        width: '10px',
        height: '100%',
        background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: isStuck ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out',
      },
      position: 'relative',
      ...filteredRest,
    };

    return <Table.Cell {...tdProps}>{children}</Table.Cell>;
  },
);

StickyTd.displayName = 'StickyTd';

const ClearRadioCell = React.memo(
  ({ betNum, arenaId }: { betNum: number; arenaId: number }) => (
    <Pd key={`bet-${betNum}-arena-${arenaId}`} backgroundColor="bg.subtle">
      <Center>
        <ClearRadio betIndex={betNum + 1} arenaIndex={arenaId} />
      </Center>
    </Pd>
  ),
  (prevProps, nextProps) =>
    prevProps.betNum === nextProps.betNum && prevProps.arenaId === nextProps.arenaId,
);

ClearRadioCell.displayName = 'ClearRadioCell';

const ClearButtonCell = React.memo(
  ({
    arenaId,
    handleBetLineChange,
  }: {
    arenaId: number;
    handleBetLineChange: (a: number, v: number) => void;
  }) => {
    const betCount = useBetCount();
    const handleClearRow = useCallback(() => {
      handleBetLineChange(arenaId, 0);
    }, [handleBetLineChange, arenaId]);

    return (
      <Pd backgroundColor="bg.subtle">
        <Button size="2xs" onClick={handleClearRow}>
          {betCount}-Bet
        </Button>
      </Pd>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

ClearButtonCell.displayName = 'ClearButtonCell';

const ClearRadioRow = React.memo(
  ({
    arenaId,
    handleBetLineChange,
  }: {
    arenaId: number;
    handleBetLineChange: (a: number, v: number) => void;
  }) => {
    const betCount = useBetCount();
    const radioCells = useMemo(() => {
      const cells = [];
      for (let betNum = 0; betNum < betCount; betNum++) {
        cells.push(
          <ClearRadioCell
            key={`clear-radio-arena-${arenaId}-bet-${betNum + 1}`}
            betNum={betNum}
            arenaId={arenaId}
          />,
        );
      }
      return cells;
    }, [betCount, arenaId]);

    return (
      <>
        {radioCells}
        <ClearButtonCell arenaId={arenaId} handleBetLineChange={handleBetLineChange} />
      </>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

ClearRadioRow.displayName = 'ClearRadioRow';

const FoodItems = React.memo(
  ({ arenaId }: { arenaId: number }) => {
    const foods = useFoodsForArena(arenaId);

    if (!foods) {
      return null;
    }

    return (
      <>
        {foods.map((foodId: number) => {
          const foodName = FOODS.get(foodId)!;
          return (
            <FaDetailsElement
              key={foodId}
              as={Pd}
              whiteSpace="nowrap"
              overflow="hidden"
              backgroundColor="bg.subtle"
              cursor="default"
              position="relative"
              _after={{
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '10px',
                height: '100%',
                background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <TextTooltip text={foodName} content={foodName} />
            </FaDetailsElement>
          );
        })}
      </>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

FoodItems.displayName = 'FoodItems';

const ArenaRatioDisplay = React.memo(
  ({ arenaId }: { arenaId: number }) => {
    const currentArenaRatio = useArenaRatios()[arenaId];
    const isUsingBigBrain = useBigBrain();

    if (!isUsingBigBrain) {
      return null;
    }

    return (
      <Skeleton loading={currentArenaRatio === undefined}>
        <TextTooltip
          text={displayAsPercent(currentArenaRatio as number, 1)}
          content={`${(currentArenaRatio as number) * 100}%`}
        />
      </Skeleton>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

ArenaRatioDisplay.displayName = 'ArenaRatioDisplay';

const EmptyBetsPlaceholder = React.memo(() => (
  <Pd colSpan={100} backgroundColor="bg.subtle">
    <Skeleton height="24px">
      <Box>&nbsp;</Box>
    </Skeleton>
  </Pd>
));

EmptyBetsPlaceholder.displayName = 'EmptyBetsPlaceholder';

const EmptyTd = React.memo((props: { colSpan?: number }) => (
  <Table.Cell backgroundColor="bg.subtle" colSpan={props.colSpan || 1} />
));

const ArenaHeaderRow = React.memo(
  ({
    arenaId,
    handleBetLineChange,
  }: {
    arenaId: number;
    handleBetLineChange: (a: number, v: number) => void;
  }) => {
    const piratesForArena = usePiratesForArena(arenaId);
    const bigBrain = useBigBrain();
    const useLogitModel = useLogitModelSetting();
    const customOddsMode = useCustomOddsMode();
    const oddsTimeline = useOddsTimeline();
    const faDetails = useFaDetails();

    const emptyColSpan = useMemo(() => {
      // because we have a bunch of columns that don't have a header TD tied to them
      // and a bunch are conditionally rendered based on the settings
      let colSpan = 0;

      // 1 for the pirate name
      colSpan += 1;

      if (bigBrain) {
        // 1 for payout
        colSpan += 1;

        // 1 for FA
        colSpan += 1;

        if (useLogitModel) {
          // 1 for the logit prob
          colSpan += 1;
        } else {
          // 3 for legacy prob min, max, std
          colSpan += 3;
        }
      }

      if (customOddsMode) {
        // 1 for custom probs input
        colSpan += 1;
      }

      return colSpan;
    }, [bigBrain, useLogitModel, customOddsMode]);

    return (
      <Table.Row>
        <Table.Cell rowSpan={5} p={2}>
          <VStack gap={1}>
            <Text fontWeight="bold">{ARENA_NAMES[arenaId]}</Text>
            <ArenaRatioDisplay arenaId={arenaId} />
          </VStack>
        </Table.Cell>
        <EmptyTd colSpan={emptyColSpan} />
        {faDetails ? <FoodItems arenaId={arenaId} /> : null}
        <EmptyTd colSpan={2} />
        {customOddsMode ? <EmptyTd /> : null}
        {oddsTimeline ? <EmptyTd /> : null}
        {piratesForArena ? (
          <ClearRadioRow arenaId={arenaId} handleBetLineChange={handleBetLineChange} />
        ) : (
          <EmptyBetsPlaceholder />
        )}
      </Table.Row>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

ArenaHeaderRow.displayName = 'ArenaHeaderRow';

// Individual pirate row component
const PirateRow = React.memo(
  ({
    pirateIndex,
    arenaId,
    handleTimelineClick,
    handleBetLineChange,
  }: {
    pirateIndex: number;
    arenaId: number;
    handleTimelineClick: (a: number, p: number) => void;
    handleBetLineChange: (a: number, v: number) => void;
  }) => {
    const pirateId = usePirateId(arenaId, pirateIndex);
    const openingOdds = useOpeningOdds(arenaId, pirateIndex);
    const currentOdds = useCurrentOdds(arenaId, pirateIndex);
    const useLogitModel = useLogitModelSetting();
    const bigBrain = useBigBrain();
    const oddsTimeline = useOddsTimeline();
    const foods = useFoodsForArena(arenaId);
    const bgColors = useBgColors();
    const winningBetBinary = useWinningBetBinary();
    const pirateBin = computePirateBinary(arenaId, pirateIndex + 1);
    const pirateWon = (winningBetBinary & pirateBin) === pirateBin;
    const betCount = useBetCount();
    const prob = useStableUsedProbability(arenaId, pirateIndex + 1);
    const logitProb = useStableLogitProbability(arenaId, pirateIndex + 1);
    const legacyProbMin = useStableLegacyProbabilityMin(arenaId, pirateIndex + 1);
    const legacyProbMax = useStableLegacyProbabilityMax(arenaId, pirateIndex + 1);
    const legacyProbStd = useStableLegacyProbabilityStd(arenaId, pirateIndex + 1);
    const pirateFA = useStablePirateFA(arenaId, pirateIndex);
    const customOddsMode = useCustomOddsMode();
    const getPirateBgColor = useGetPirateBgColor();
    const faDetails = useFaDetails();
    const useOdds = currentOdds;
    const payout = useOdds * prob - 1;

    const payoutBackground = useMemo(() => {
      if (payout > 0) {
        return bgColors.payoutPositive;
      } else if (payout <= -0.1) {
        return bgColors.payoutNegative;
      }
      return bgColors.payoutNeutral;
    }, [payout, bgColors]);

    const handleTimelineClickLocal = useCallback(() => {
      handleTimelineClick(arenaId, pirateIndex);
    }, [handleTimelineClick, arenaId, pirateIndex]);

    const handleBetLineChangeLocal = useCallback(() => {
      handleBetLineChange(arenaId, pirateIndex + 1);
    }, [handleBetLineChange, arenaId, pirateIndex]);

    const betRadios = useMemo(() => {
      const radios = [];
      for (let betNum = 0; betNum < betCount; betNum++) {
        radios.push(
          <Pd key={`bet-${betNum + 1}-arena-${arenaId}-pirate-${pirateId}`}>
            <Center>
              <BetRadio betIndex={betNum + 1} arenaIndex={arenaId} pirateIndex={pirateIndex + 1} />
            </Center>
          </Pd>,
        );
      }
      return radios;
    }, [betCount, arenaId, pirateIndex, pirateId]);

    const logitProbElement = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      if (!useLogitModel) {
        return null;
      }

      return <Table.Cell textAlign="end">{displayAsPercent(logitProb, 1)}</Table.Cell>;
    }, [logitProb, useLogitModel, bigBrain]);

    const faElement = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      return <Table.Cell textAlign="end">{pirateFA}</Table.Cell>;
    }, [pirateFA, bigBrain]);

    const legacyProbElements = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      if (useLogitModel) {
        return null;
      }

      return (
        <>
          <Table.Cell textAlign="end">{displayAsPercent(legacyProbMin, 1)}</Table.Cell>
          <Table.Cell textAlign="end">{displayAsPercent(legacyProbMax, 1)}</Table.Cell>
          <Table.Cell textAlign="end">{displayAsPercent(legacyProbStd, 1)}</Table.Cell>
        </>
      );
    }, [legacyProbMin, legacyProbMax, legacyProbStd, useLogitModel, bigBrain]);

    const faDetailsElement = useMemo(() => {
      if (!foods) {
        return null;
      }

      if (!bigBrain) {
        return null;
      }

      if (!faDetails) {
        return null;
      }

      return (
        <>
          {foods.map((foodId: number) => (
            <PirateFA
              key={`fa-${foodId}-${pirateId!}-${arenaId}`}
              pirateId={pirateId!}
              foodId={foodId}
            />
          ))}
        </>
      );
    }, [foods, pirateId, arenaId, bigBrain, faDetails]);

    const timelineElement = useMemo(() => {
      if (!oddsTimeline) {
        return null;
      }

      return (
        <OddsTimeline
          arenaId={arenaId}
          pirateIndex={pirateIndex}
          onClick={handleTimelineClickLocal}
        />
      );
    }, [arenaId, pirateIndex, handleTimelineClickLocal, oddsTimeline]);

    const customOddsInputElement = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      if (!customOddsMode) {
        return null;
      }

      return (
        <Pd>
          <CustomOddsInput arenaIndex={arenaId} pirateIndex={pirateIndex + 1} />
        </Pd>
      );
    }, [arenaId, pirateIndex, customOddsMode, bigBrain]);

    const customProbsInputElement = useMemo(() => {
      if (!customOddsMode) {
        return null;
      }

      return (
        <Pd>
          <CustomProbsInput arenaIndex={arenaId} pirateIndex={pirateIndex + 1} />
        </Pd>
      );
    }, [arenaId, pirateIndex, customOddsMode]);

    const payoutElement = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      return (
        <Table.Cell textAlign="end" backgroundColor={payoutBackground}>
          {displayAsPercent(payout, 1)}
        </Table.Cell>
      );
    }, [payout, payoutBackground, bigBrain]);

    // Odds comparison logic
    const oddsIncreased = currentOdds > openingOdds;
    const oddsChanged = currentOdds !== openingOdds;

    // Return skeleton if no pirate ID
    if (!pirateId) {
      return (
        <Table.Row>
          <Table.Cell colSpan={100}>
            <Skeleton height="24px">&nbsp;</Skeleton>
          </Table.Cell>
        </Table.Row>
      );
    }

    const pirateName = PIRATE_NAMES.get(pirateId) as string;
    const fullPirateName = FULL_PIRATE_NAMES.get(pirateId) as string;

    return (
      <Table.Row
        key={`pirate-${pirateId}-${arenaId}`}
        backgroundColor={pirateWon ? bgColors.winner : 'transparent'}
      >
        <StickyTd
          backgroundColor={getPirateBgColor(openingOdds)}
          onClick={handleTimelineClickLocal}
          cursor="pointer"
          title={`Click to view odds timeline for ${fullPirateName}`}
        >
          {pirateName}
        </StickyTd>
        {useLogitModel ? logitProbElement : legacyProbElements}
        {customProbsInputElement}
        {payoutElement}
        {faElement}
        {faDetailsElement}
        <Table.Cell textAlign="end">{openingOdds}:1</Table.Cell>
        <Table.Cell textAlign="end" whiteSpace="nowrap">
          <Box display="flex" alignItems="center" justifyContent="flex-end">
            {oddsChanged && (
              <Icon color={oddsIncreased ? 'green.fg' : 'red.fg'} mr={1}>
                {oddsIncreased ? <FaCaretUp /> : <FaCaretDown />}
              </Icon>
            )}
            <Text fontWeight={oddsChanged ? 'bold' : 'normal'}>{currentOdds}:1</Text>
          </Box>
        </Table.Cell>
        {customOddsInputElement}
        {timelineElement}
        {betRadios}
        <Table.Cell py={0}>
          <Button size="2xs" onClick={handleBetLineChangeLocal}>
            {betCount}-Bet
          </Button>
        </Table.Cell>
      </Table.Row>
    );
  },
  (prevProps, nextProps) =>
    prevProps.pirateIndex === nextProps.pirateIndex && prevProps.arenaId === nextProps.arenaId,
);

PirateRow.displayName = 'PirateRow';

// Main ArenaTableBody component
const ArenaTableBody = React.memo(
  ({
    arenaId,
    handleTimelineClick,
    handleBetLineChange,
  }: {
    arenaId: number;
    handleTimelineClick: (a: number, p: number) => void;
    handleBetLineChange: (a: number, v: number) => void;
  }) => {
    // Get all the data from the stores
    const piratesForArena = usePiratesForArena(arenaId);

    const headerRow = useMemo(
      () => <ArenaHeaderRow arenaId={arenaId} handleBetLineChange={handleBetLineChange} />,
      [arenaId, handleBetLineChange],
    );

    const pirateRows = useMemo(() => {
      if (!piratesForArena) {
        return null;
      }

      return piratesForArena.map((pirateId, pirateIndex) => (
        <PirateRow
          key={`pirate-${arenaId}-${pirateId}`}
          pirateIndex={pirateIndex}
          arenaId={arenaId}
          handleTimelineClick={handleTimelineClick}
          handleBetLineChange={handleBetLineChange}
        />
      ));
    }, [piratesForArena, arenaId, handleTimelineClick, handleBetLineChange]);

    return (
      <>
        <Table.Body key={`arena-${arenaId}`}>
          {headerRow}
          {pirateRows}
        </Table.Body>
      </>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId &&
    prevProps.handleTimelineClick === nextProps.handleTimelineClick &&
    prevProps.handleBetLineChange === nextProps.handleBetLineChange,
);

ArenaTableBody.displayName = 'ArenaTableBody';

export default ArenaTableBody;
