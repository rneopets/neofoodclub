import {
  Box,
  Button,
  Center,
  Icon,
  IconButton,
  Popover,
  Portal,
  Skeleton,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { FaCaretDown, FaCaretUp, FaFillDrip } from 'react-icons/fa6';
import { LuArrowLeftRight } from 'react-icons/lu';

import {
  PIRATE_NAMES,
  FULL_PIRATE_NAMES,
  POSITIVE_FAS,
  NEGATIVE_FAS,
  ARENA_NAMES,
  FOODS,
} from '../../constants';
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
  useOpeningOddsValue,
  useCurrentOddsValue,
  useWinningBetBinary,
  useStableUsedProbability,
  useStableLogitProbability,
  useStableLegacyProbabilityMin,
  useStableLegacyProbabilityMax,
  useStableLegacyProbabilityStd,
  useStablePirateFA,
  useCustomOddsMode,
  useFaDetails,
  useSwapPiratesForAllBets,
  useBetStore,
} from '../../stores';
import { displayAsPercent } from '../../util';
import BetRadio, { ClearRadio } from '../BetRadio';
import CustomOddsInput from '../CustomOddsInput';
import CustomProbsInput from '../CustomProbsInput';
import FaDetailsElement from '../FaDetailsElement';
import OddsTimeline from '../OddsTimeline';
import PirateSelect from '../PirateSelect';
import Td from '../Td';
import TextTooltip from '../TextTooltip';

import { Tooltip } from '@/components/ui/tooltip';

const ROTATE_90_STYLE = { transform: 'rotate(90deg)' } as const;

// Component to show Food Adjustment for a pirate and food
const PirateFA = React.memo(
  (props: { pirateId: number; foodId: number }): React.ReactElement | null => {
    const { pirateId, foodId } = props;
    // returns the FA <td> element for the associated pirate/food

    const pos = POSITIVE_FAS[pirateId]![foodId]!;
    const neg = NEGATIVE_FAS[pirateId]![foodId]!;

    // by default, transparent + empty string if FA is 0
    let color = undefined;
    let indicator = '';

    if (pos && neg) {
      color = 'yellow';
      // fgColor = 'yellow.fg';
      indicator = `+${pos}/-${neg}`;
    } else if (pos) {
      color = 'green';
      indicator = `+${pos}`;
    } else if (neg) {
      color = 'red';
      indicator = `-${neg}`;
    }

    return (
      <FaDetailsElement
        key={`fa-${foodId}-pirate-${pirateId}`}
        as={Td}
        textAlign="end"
        {...(color && { layerStyle: 'fill.subtle', colorPalette: color })}
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
    <Td key={`bet-${betNum}-arena-${arenaId}`} backgroundColor="bg.subtle">
      <Center>
        <ClearRadio betIndex={betNum + 1} arenaIndex={arenaId} />
      </Center>
    </Td>
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
      <Td backgroundColor="bg.subtle">
        <Button size="2xs" onClick={handleClearRow}>
          {betCount}-Bet
        </Button>
      </Td>
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
              as={Td}
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
  <Td colSpan={100} backgroundColor="bg.subtle">
    <Skeleton height="24px">
      <Box>&nbsp;</Box>
    </Skeleton>
  </Td>
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
        <Table.Cell rowSpan={5} p={2} backgroundColor="bg.subtle">
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
    const openingOdds = useOpeningOddsValue(arenaId, pirateIndex);
    const currentOdds = useCurrentOddsValue(arenaId, pirateIndex);
    const useLogitModel = useLogitModelSetting();
    const bigBrain = useBigBrain();
    const oddsTimeline = useOddsTimeline();
    const foods = useFoodsForArena(arenaId);
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
    const payout = useOdds! * prob - 1;

    const payoutBackground = useMemo(() => {
      if (payout > 0) {
        return 'green';
      } else if (payout <= -0.1) {
        return 'red';
      }
      return undefined;
    }, [payout]);

    const handleTimelineClickLocal = useCallback(() => {
      handleTimelineClick(arenaId, pirateIndex);
    }, [handleTimelineClick, arenaId, pirateIndex]);

    const handleBetLineChangeLocal = useCallback(() => {
      handleBetLineChange(arenaId, pirateIndex + 1);
    }, [handleBetLineChange, arenaId, pirateIndex]);

    const swapPiratesForAllBets = useSwapPiratesForAllBets();
    const [swapOpen, setSwapOpen] = useState(false);
    const [swapToPirate, setSwapToPirate] = useState(0);
    const fromPirateIndex = pirateIndex + 1;

    const arenaHasAnyChosen = useBetStore(state => {
      const bets = state.allBets.get(state.currentBet);
      if (!bets) {
        return false;
      }
      for (const betLine of bets.values()) {
        const line = betLine ?? [0, 0, 0, 0, 0];
        if ((line[arenaId] ?? 0) > 0) {
          return true;
        }
      }
      return false;
    });

    const canSwap = useMemo(
      () => swapToPirate !== fromPirateIndex,
      [swapToPirate, fromPirateIndex],
    );

    const handleSwapOpenChange = useCallback((e: { open: boolean }) => {
      setSwapOpen(e.open);
      if (e.open) {
        setSwapToPirate(0);
      }
    }, []);

    const handleSwapToPirateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setSwapToPirate(parseInt(e.target.value));
    }, []);

    const handleCancelSwap = useCallback(() => {
      setSwapOpen(false);
    }, []);

    const handleApplySwap = useCallback(() => {
      if (!canSwap) {
        return;
      }
      swapPiratesForAllBets(arenaId, fromPirateIndex, swapToPirate);
      setSwapOpen(false);
    }, [canSwap, swapPiratesForAllBets, arenaId, fromPirateIndex, swapToPirate]);

    const betRadios = useMemo(() => {
      const radios = [];
      for (let betNum = 0; betNum < betCount; betNum++) {
        radios.push(
          <Td key={`bet-${betNum + 1}-arena-${arenaId}-pirate-${pirateId}`}>
            <Center>
              <BetRadio betIndex={betNum + 1} arenaIndex={arenaId} pirateIndex={pirateIndex + 1} />
            </Center>
          </Td>,
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

      return (
        <Table.Cell
          textAlign="end"
          {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
        >
          {displayAsPercent(logitProb, 1)}
        </Table.Cell>
      );
    }, [logitProb, useLogitModel, bigBrain, pirateWon]);

    const faElement = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      return (
        <Table.Cell
          textAlign="end"
          {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
        >
          {pirateFA}
        </Table.Cell>
      );
    }, [pirateFA, bigBrain, pirateWon]);

    const legacyProbElements = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      if (useLogitModel) {
        return null;
      }

      return (
        <>
          <Table.Cell
            textAlign="end"
            {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
          >
            {displayAsPercent(legacyProbMin, 1)}
          </Table.Cell>
          <Table.Cell
            textAlign="end"
            {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
          >
            {displayAsPercent(legacyProbMax, 1)}
          </Table.Cell>
          <Table.Cell
            textAlign="end"
            {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
          >
            {displayAsPercent(legacyProbStd, 1)}
          </Table.Cell>
        </>
      );
    }, [legacyProbMin, legacyProbMax, legacyProbStd, useLogitModel, bigBrain, pirateWon]);

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
        <Td>
          <CustomOddsInput
            arenaIndex={arenaId}
            pirateIndex={pirateIndex + 1}
            {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
          />
        </Td>
      );
    }, [arenaId, pirateIndex, customOddsMode, bigBrain, pirateWon]);

    const customProbsInputElement = useMemo(() => {
      if (!customOddsMode) {
        return null;
      }

      return (
        <Td>
          <CustomProbsInput
            arenaIndex={arenaId}
            pirateIndex={pirateIndex + 1}
            {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
          />
        </Td>
      );
    }, [arenaId, pirateIndex, customOddsMode, pirateWon]);

    const payoutElement = useMemo(() => {
      if (!bigBrain) {
        return null;
      }

      return (
        <Table.Cell
          textAlign="end"
          {...(payoutBackground && { layerStyle: 'fill.subtle', colorPalette: payoutBackground })}
        >
          {displayAsPercent(payout, 1)}
        </Table.Cell>
      );
    }, [payout, payoutBackground, bigBrain]);

    // Odds comparison logic
    const oddsIncreased = currentOdds! > openingOdds!;
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
        backgroundColor={pirateWon ? 'green.subtle' : 'transparent'}
      >
        <StickyTd
          layerStyle="fill.muted"
          colorPalette={getPirateBgColor(openingOdds!)}
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
        <Table.Cell
          textAlign="end"
          {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
        >
          {openingOdds}:1
        </Table.Cell>
        <Table.Cell
          textAlign="end"
          whiteSpace="nowrap"
          {...(pirateWon && { layerStyle: 'fill.subtle', colorPalette: 'green' })}
        >
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
        <Table.Cell py={0} whiteSpace="nowrap">
          <Box display="flex" gap={1} justifyContent="center">
            <Tooltip content="10-bet" openDelay={600} placement="top">
              <IconButton
                aria-label="10-bet"
                size="2xs"
                variant="ghost"
                onClick={handleBetLineChangeLocal}
              >
                <FaFillDrip />
              </IconButton>
            </Tooltip>

            <Popover.Root
              open={swapOpen}
              onOpenChange={handleSwapOpenChange}
              positioning={{ placement: 'bottom-end' }}
              lazyMount
              unmountOnExit
            >
              <Popover.Trigger asChild>
                <Box as="span" display="inline-flex">
                  <Tooltip
                    content="Swap pirate"
                    openDelay={600}
                    placement="top"
                    disabled={!arenaHasAnyChosen}
                  >
                    <IconButton
                      aria-label="Swap pirate"
                      size="2xs"
                      variant="ghost"
                      disabled={!arenaHasAnyChosen}
                    >
                      <LuArrowLeftRight style={ROTATE_90_STYLE} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Popover.Trigger>
              <Portal container={document.body}>
                <Popover.Positioner>
                  <Popover.Content width="260px">
                    <Popover.Arrow />
                    <Popover.Body>
                      <VStack align="stretch" gap={2}>
                        <Text fontSize="sm" fontWeight="semibold">
                          Swap {PIRATE_NAMES.get(pirateId) ?? 'pirate'}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          Swaps this pirate with another across all bets in {ARENA_NAMES[arenaId]}.
                        </Text>
                        <PirateSelect
                          arenaId={arenaId}
                          pirateValue={swapToPirate}
                          onChange={handleSwapToPirateChange}
                        />
                        <Box display="flex" justifyContent="flex-end" gap={2}>
                          <Button size="xs" variant="outline" onClick={handleCancelSwap}>
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            colorPalette="blue"
                            disabled={!canSwap || !arenaHasAnyChosen}
                            onClick={handleApplySwap}
                          >
                            Apply
                          </Button>
                        </Box>
                      </VStack>
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          </Box>
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
