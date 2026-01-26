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
import React, { useCallback, useMemo, useState } from 'react';
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
import BetRadio, { ClearRadio } from '../bets/BetRadio';
import CustomOddsInput from '../bets/CustomOddsInput';
import CustomProbsInput from '../bets/CustomProbsInput';
import PirateSelect from '../bets/PirateSelect';
import OddsTimeline from '../timeline/OddsTimeline';
import FaDetailsElement from '../ui/FaDetailsElement';
import TextTooltip from '../ui/TextTooltip';

import Td from './Td';

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

    // Filter out undefined values to satisfy exactOptionalPropertyTypes
    const filteredRest = Object.fromEntries(
      Object.entries(rest).filter(([_, value]) => value !== undefined),
    );

    const tdProps: React.ComponentProps<typeof Table.Cell> = {
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
        opacity: 1,
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
    handleArenaTimelineClick,
  }: {
    arenaId: number;
    handleBetLineChange: (a: number, v: number) => void;
    handleArenaTimelineClick: (arenaId: number) => void;
  }) => {
    const piratesForArena = usePiratesForArena(arenaId);
    const bigBrain = useBigBrain();
    const useLogitModel = useLogitModelSetting();
    const customOddsMode = useCustomOddsMode();
    const oddsTimeline = useOddsTimeline();
    const faDetails = useFaDetails();

    const handleArenaTimelineClickLocal = useCallback(() => {
      handleArenaTimelineClick(arenaId);
    }, [handleArenaTimelineClick, arenaId]);

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
        <Table.Cell
          rowSpan={5}
          p={2}
          backgroundColor="bg.subtle"
          cursor="pointer"
          onClick={handleArenaTimelineClickLocal}
          title={`Click to view odds timeline for ${ARENA_NAMES[arenaId]}`}
          _hover={{ bg: 'bg.emphasized' }}
        >
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
      if (pirateWon || payout > 0) {
        return 'green';
      } else if (payout <= -0.1) {
        return 'red';
      }
      return undefined;
    }, [payout, pirateWon]);

    const handleTimelineClickLocal = useCallback(() => {
      handleTimelineClick(arenaId, pirateIndex);
    }, [handleTimelineClick, arenaId, pirateIndex]);

    const handleBetLineChangeLocal = useCallback(() => {
      handleBetLineChange(arenaId, pirateIndex + 1);
    }, [handleBetLineChange, arenaId, pirateIndex]);

    const swapPiratesForAllBets = useSwapPiratesForAllBets();
    const [swapOpen, setSwapOpen] = useState(false);
    const [swapFromPirate, setSwapFromPirate] = useState(0);
    const [swapToPirate, setSwapToPirate] = useState(0);
    const fromPirateIndex = pirateIndex + 1;

    const currentBetsForSet = useBetStore(state => state.allBets.get(state.currentBet));

    const { swapFromBetCount, swapToBetCount, arenaHasAnyChosen } = useMemo(() => {
      if (!currentBetsForSet) {
        return { swapFromBetCount: 0, swapToBetCount: 0, arenaHasAnyChosen: false };
      }

      let swapFromBetCountLocal = 0;
      let swapToBetCountLocal = 0;
      let arenaHasAnyChosenLocal = false;

      const hasSwapFrom = swapFromPirate !== 0;
      const hasSwapTo = swapToPirate !== 0;

      for (const betLine of currentBetsForSet.values()) {
        const line = betLine ?? [0, 0, 0, 0, 0];
        const selected = line[arenaId] ?? 0;

        if (!arenaHasAnyChosenLocal && selected > 0) {
          arenaHasAnyChosenLocal = true;
        }
        if (hasSwapFrom && selected === swapFromPirate) {
          swapFromBetCountLocal++;
        }
        if (hasSwapTo && selected === swapToPirate) {
          swapToBetCountLocal++;
        }
      }

      return {
        swapFromBetCount: swapFromBetCountLocal,
        swapToBetCount: swapToBetCountLocal,
        arenaHasAnyChosen: arenaHasAnyChosenLocal,
      };
    }, [currentBetsForSet, arenaId, swapFromPirate, swapToPirate]);

    const canSwap = useMemo(
      () => swapFromPirate !== 0 && swapToPirate !== 0 && swapFromPirate !== swapToPirate,
      [swapFromPirate, swapToPirate],
    );

    const handleSwapOpenChange = useCallback(
      (e: { open: boolean }) => {
        setSwapOpen(e.open);
        if (e.open) {
          setSwapFromPirate(fromPirateIndex);
          setSwapToPirate(0);
        }
      },
      [fromPirateIndex],
    );

    const handleSwapFromPirateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setSwapFromPirate(parseInt(e.target.value));
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
      swapPiratesForAllBets(arenaId, swapFromPirate, swapToPirate);
      setSwapOpen(false);
    }, [canSwap, swapPiratesForAllBets, arenaId, swapFromPirate, swapToPirate]);

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
                  <Popover.Content width="360px">
                    <Popover.Arrow />
                    <Popover.Body>
                      <VStack align="center" gap={2}>
                        <Text fontSize="sm" fontWeight="semibold" textAlign="center">
                          Swap pirates
                        </Text>
                        <Text fontSize="xs" color="fg.muted" textAlign="center">
                          Swaps the two selected pirates in all bets for {ARENA_NAMES[arenaId]}.
                        </Text>
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          gap={2}
                          flexWrap="wrap"
                        >
                          <Box>
                            <PirateSelect
                              arenaId={arenaId}
                              pirateValue={swapFromPirate}
                              includeNoPirate={false}
                              deselectable={false}
                              onChange={handleSwapFromPirateChange}
                            />
                            <Text fontSize="2xs" color="fg.muted" mt={1} textAlign="center">
                              {swapFromBetCount} bets
                            </Text>
                          </Box>
                          <Icon color="fg.muted" mt={5}>
                            <LuArrowLeftRight />
                          </Icon>
                          <Box>
                            <PirateSelect
                              arenaId={arenaId}
                              pirateValue={swapToPirate}
                              includeNoPirate={false}
                              onChange={handleSwapToPirateChange}
                            />
                            <Text fontSize="2xs" color="fg.muted" mt={1} textAlign="center">
                              {swapToBetCount} bets
                            </Text>
                          </Box>
                        </Box>
                        <Box display="flex" justifyContent="center" gap={2} width="100%">
                          <Button size="xs" variant="outline" onClick={handleCancelSwap}>
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            colorPalette="blue"
                            disabled={
                              !canSwap ||
                              !arenaHasAnyChosen ||
                              (swapFromBetCount === 0 && swapToBetCount === 0)
                            }
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
    handleArenaTimelineClick,
    handleBetLineChange,
  }: {
    arenaId: number;
    handleTimelineClick: (a: number, p: number) => void;
    handleArenaTimelineClick: (arenaId: number) => void;
    handleBetLineChange: (a: number, v: number) => void;
  }) => {
    // Get all the data from the stores
    const piratesForArena = usePiratesForArena(arenaId);

    const headerRow = useMemo(
      () => (
        <ArenaHeaderRow
          arenaId={arenaId}
          handleBetLineChange={handleBetLineChange}
          handleArenaTimelineClick={handleArenaTimelineClick}
        />
      ),
      [arenaId, handleBetLineChange, handleArenaTimelineClick],
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
    prevProps.handleArenaTimelineClick === nextProps.handleArenaTimelineClick &&
    prevProps.handleBetLineChange === nextProps.handleBetLineChange,
);

ArenaTableBody.displayName = 'ArenaTableBody';

export default ArenaTableBody;
