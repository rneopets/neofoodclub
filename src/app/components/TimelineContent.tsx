import {
  Box,
  DrawerHeader,
  DrawerBody,
  Flex,
  Heading,
  Text,
  VStack,
  Spacer,
  Breadcrumb,
  Button,
  Collapsible,
  ButtonGroup,
  defineStyle,
  Badge,
} from '@chakra-ui/react';
import React, { useCallback, useRef } from 'react';
import {
  FaUtensils,
  FaSkullCrossbones,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaMedal,
  FaChartLine,
  FaChevronDown,
  FaWaveSquare,
} from 'react-icons/fa6';

import { OddsChange } from '../../types';
import { PIRATE_NAMES, ARENA_NAMES } from '../constants';
import { useGetPirateBgColor } from '../hooks/useGetPirateBgColor';
import { useIsRoundOver } from '../hooks/useIsRoundOver';
import { useScrollPosition } from '../hooks/useScrollPosition';
import { useTimelineViewState } from '../hooks/useTimelineViewState';
import { makeEmpty } from '../maths';
import { useRoundStore, useCurrentOddsValue, useOpeningOddsValue } from '../stores';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../utils/betUtils';

import DateFormatter from './DateFormatter';

import { Avatar } from '@/components/ui/avatar';
import { Timeline } from '@/components/ui/timeline';
import { Tooltip } from '@/components/ui/tooltip';

const ringCss = defineStyle({
  outlineWidth: '2px',
  outlineColor: 'colorPalette.500',
  outlineOffset: '2px',
  outlineStyle: 'solid',
});

const avatarWrapperCss = defineStyle({
  '& [data-part="image"]': {
    width: '70.7%',
    height: '70.7%',
    objectFit: 'contain',
    objectPosition: 'center',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '0',
    aspectRatio: '1 / 1',
  },
});

// Helper function to consolidate consecutive single-pirate changes
function consolidateTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
  const consolidatedEvents: TimelineEvent[] = [];
  let i = 0;

  while (i < events.length) {
    const event = events[i];

    // Check if this is a single-pirate change event
    if (event?.type === 'change' && event.pirates.length === 1 && event.pirates[0]) {
      const firstPirateChange = event.pirates[0];
      const consecutiveChanges: TimelineChangeEvent[] = [event];
      let j = i + 1;

      // Look ahead for consecutive changes of the same pirate
      while (j < events.length) {
        const nextEvent = events[j];

        // Must be a change event
        if (nextEvent?.type !== 'change') {
          break;
        }

        // If it's a multi-pirate change, stop consolidating
        if (nextEvent.pirates.length !== 1) {
          break;
        }

        const nextPirate = nextEvent.pirates[0];
        if (!nextPirate) {
          break;
        }

        // If it's the same pirate, add it to consolidation
        if (
          nextPirate.arenaId === firstPirateChange.arenaId &&
          nextPirate.pirateIndex === firstPirateChange.pirateIndex
        ) {
          consecutiveChanges.push(nextEvent);
          j++;
        } else {
          // Different pirate, stop consolidating
          break;
        }
      }

      // If we found multiple consecutive changes for the same pirate, consolidate them
      if (consecutiveChanges.length > 1) {
        const firstChange = consecutiveChanges[0];
        const lastChange = consecutiveChanges[consecutiveChanges.length - 1];
        const firstOdds = firstChange?.pirates[0]?.oldOdds;
        const lastOdds = lastChange?.pirates[0]?.newOdds;

        // Only consolidate if the odds actually changed overall
        if (firstChange && lastChange && firstOdds && lastOdds && firstOdds !== lastOdds) {
          const hasIncreases = consecutiveChanges.some(c => c.pirates[0]?.isIncrease);
          const hasDecreases = consecutiveChanges.some(c => !c.pirates[0]?.isIncrease);

          let color = 'gray';
          let icon = <FaArrowUp />;

          if (hasIncreases && hasDecreases) {
            color = 'blue';
            icon = <FaWaveSquare />;
          } else if (lastOdds > firstOdds) {
            color = 'green';
            icon = <FaArrowUp />;
          } else {
            color = 'red';
            icon = <FaArrowDown />;
          }

          const distinctChangesCount = consecutiveChanges.length;

          consolidatedEvents.push({
            id: `consolidated-${firstChange.id}`,
            icon,
            title: `${firstPirateChange.pirateName}${firstChange === consecutiveChanges[0] && firstPirateChange.arenaName ? ` - ${firstPirateChange.arenaName}` : ''}`,
            description: `${distinctChangesCount} change${distinctChangesCount !== 1 ? 's' : ''}: ${firstOdds}:1 → ${lastOdds}:1`,
            time: firstChange.time,
            color,
            type: 'consolidated' as const,
            changes: consecutiveChanges,
            pirate: {
              arenaId: firstPirateChange.arenaId,
              pirateIndex: firstPirateChange.pirateIndex,
              pirateName: firstPirateChange.pirateName,
              pirateId: firstPirateChange.pirateId,
              arenaName: firstPirateChange.arenaName,
            },
          });

          i = j; // Skip past all the consolidated events
        } else {
          // Don't consolidate if odds end up the same - add each change individually
          consecutiveChanges.forEach(change => {
            consolidatedEvents.push(change);
          });
          i = j;
        }
      } else {
        // Single change, add as-is
        consolidatedEvents.push(event);
        i++;
      }
    } else {
      // Not a change event or not a single pirate, add as-is
      if (event) {
        consolidatedEvents.push(event);
      }
      i++;
    }
  }

  return consolidatedEvents;
}

// Component to render consolidated changes
const ConsolidatedChangesContent = React.memo(
  (props: {
    event: TimelineConsolidatedEvent;
    onPirateClick: (arenaId: number, pirateIndex: number) => void;
  }): React.ReactElement => {
    const { event, onPirateClick } = props;
    const getPirateBgColor = useGetPirateBgColor();
    const roundData = useRoundStore(state => state.roundData);
    const openingOdds = roundData.openingOdds?.[event.pirate.arenaId]?.[
      event.pirate.pirateIndex + 1
    ] as number | undefined;
    const colorPalette = openingOdds ? getPirateBgColor(openingOdds) : undefined;

    return (
      <Box mt={2}>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => onPirateClick(event.pirate.arenaId, event.pirate.pirateIndex)}
          mb={2}
        >
          <Box css={avatarWrapperCss} display="inline-block">
            <Avatar
              name={event.pirate.pirateName}
              src={`https://images.neopets.com/pirates/fc/fc_pirate_${event.pirate.pirateId}.gif`}
              size="2xs"
              bg="white"
              css={colorPalette ? ringCss : undefined}
              colorPalette={colorPalette}
            />
          </Box>
          View Timeline
        </Button>
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button size="xs" variant="outline">
              <Text fontSize="xs">Show all changes</Text>
              <Collapsible.Indicator
                transition="transform 0.2s"
                _open={{ transform: 'rotate(180deg)' }}
              >
                <FaChevronDown />
              </Collapsible.Indicator>
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <VStack align="stretch" gap={2} mt={2} pl={4}>
              {event.changes.map((change, idx) => {
                const pirate = change.pirates[0];
                if (!pirate) {
                  return null;
                }

                return (
                  <Flex key={change.id} gap={2} alignItems="center" fontSize="xs">
                    <Text color="fg.muted">#{idx + 1}:</Text>
                    <Text color="fg.muted">
                      {pirate.oldOdds}:1 →{' '}
                      <Text
                        as="span"
                        fontWeight="semibold"
                        color={pirate.isIncrease ? 'green.500' : 'red.500'}
                      >
                        {pirate.newOdds}:1
                      </Text>
                    </Text>
                    <Text color="fg.muted" fontSize="2xs">
                      <DateFormatter
                        format="LTS [NST]"
                        date={change.time}
                        tz="America/Los_Angeles"
                      />
                    </Text>
                  </Flex>
                );
              })}
            </VStack>
          </Collapsible.Content>
        </Collapsible.Root>
      </Box>
    );
  },
);

ConsolidatedChangesContent.displayName = 'ConsolidatedChangesContent';

// Component to render regular change events
const RegularChangesContent = React.memo(
  (props: {
    event: TimelineChangeEvent;
    onPirateClick: (arenaId: number, pirateIndex: number) => void;
    showArenaName?: boolean;
  }): React.ReactElement => {
    const { event, onPirateClick, showArenaName = false } = props;
    const getPirateBgColor = useGetPirateBgColor();
    const roundData = useRoundStore(state => state.roundData);

    return (
      <VStack align="stretch" gap={1} mt={2}>
        {event.pirates.map(pirate => {
          const openingOdds = roundData.openingOdds?.[pirate.arenaId]?.[pirate.pirateIndex + 1] as
            | number
            | undefined;
          const colorPalette = openingOdds ? getPirateBgColor(openingOdds) : undefined;

          return (
            <Flex
              key={`${pirate.arenaId}-${pirate.pirateIndex}`}
              gap={2}
              alignItems="center"
              flexWrap="wrap"
            >
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onPirateClick(pirate.arenaId, pirate.pirateIndex)}
              >
                <Box css={avatarWrapperCss} display="inline-block">
                  <Avatar
                    name={pirate.pirateName}
                    src={`https://images.neopets.com/pirates/fc/fc_pirate_${pirate.pirateId}.gif`}
                    size="2xs"
                    bg="white"
                    css={colorPalette ? ringCss : undefined}
                    colorPalette={colorPalette}
                  />
                </Box>
                {pirate.pirateName}
              </Button>
              <Text fontSize="xs" color="fg.muted">
                {showArenaName && `${pirate.arenaName}: `}
                {pirate.oldOdds}:1 →{' '}
                <Text
                  as="span"
                  fontWeight="semibold"
                  color={pirate.isIncrease ? 'green.500' : 'red.500'}
                >
                  {pirate.newOdds}:1
                </Text>
              </Text>
            </Flex>
          );
        })}
      </VStack>
    );
  },
);

RegularChangesContent.displayName = 'RegularChangesContent';

// Component to render winner events
const WinnersContent = React.memo(
  (props: {
    winners: WinningPirate[];
    onPirateClick: (arenaId: number, pirateIndex: number) => void;
    showArenaName?: boolean;
  }): React.ReactElement => {
    const { winners, onPirateClick, showArenaName = false } = props;
    const getPirateBgColor = useGetPirateBgColor();

    return (
      <VStack align="stretch" gap={2} mt={3}>
        {winners.map(winner => {
          const colorPalette = getPirateBgColor(winner.finalOdds);

          return (
            <Flex
              key={`winner-${winner.arenaId}-${winner.pirateIndex}`}
              gap={3}
              alignItems="center"
              p={2}
              borderRadius="md"
              bg="bg.muted"
              _hover={{ bg: 'bg.emphasized' }}
              transition="background 0.2s"
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPirateClick(winner.arenaId, winner.pirateIndex)}
                p={0}
              >
                <Box css={avatarWrapperCss} display="inline-block">
                  <Avatar
                    name={winner.pirateName}
                    src={`https://images.neopets.com/pirates/fc/fc_pirate_${winner.pirateId}.gif`}
                    size="sm"
                    bg="white"
                    css={ringCss}
                    colorPalette={colorPalette}
                  />
                </Box>
              </Button>
              <Box flex="1">
                <Flex gap={2} alignItems="baseline" flexWrap="wrap">
                  <Text fontWeight="bold" fontSize="sm">
                    {winner.pirateName}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {showArenaName ? winner.arenaName : `${winner.finalOdds}:1`}
                  </Text>
                </Flex>
                {showArenaName && (
                  <Text fontSize="xs" color="fg.muted">
                    Won at{' '}
                    <Text as="span" fontWeight="semibold" color="green.500">
                      {winner.finalOdds}:1
                    </Text>
                  </Text>
                )}
              </Box>
              <Text fontSize="2xl">🏆</Text>
            </Flex>
          );
        })}
      </VStack>
    );
  },
);

WinnersContent.displayName = 'WinnersContent';

// Types for timeline events
type TimelineStartEvent = {
  id: string;
  icon: React.ReactElement;
  title: string;
  description: string;
  time: Date;
  color: string;
  type: 'start';
};

type PirateChange = {
  arenaId: number;
  pirateIndex: number;
  pirateName: string;
  pirateId: number;
  arenaName: string;
  oldOdds: number;
  newOdds: number;
  isIncrease: boolean;
};

type TimelineChangeEvent = {
  id: string;
  icon: React.ReactElement;
  title: string;
  description: string;
  time: Date;
  color: string;
  type: 'change';
  pirates: PirateChange[];
};

type TimelineConsolidatedEvent = {
  id: string;
  icon: React.ReactElement;
  title: string;
  description: string;
  time: Date;
  color: string;
  type: 'consolidated';
  changes: TimelineChangeEvent[];
  pirate: {
    arenaId: number;
    pirateIndex: number;
    pirateName: string;
    pirateId: number;
    arenaName: string;
  };
};

type WinningPirate = {
  arenaId: number;
  pirateIndex: number;
  pirateName: string;
  pirateId: number;
  arenaName: string;
  finalOdds: number;
};

type TimelineEndEvent = {
  id: string;
  icon: React.ReactElement;
  title: string;
  description: string;
  time: Date;
  color: string;
  type: 'end';
  winners?: WinningPirate[];
};

type TimelineEvent =
  | TimelineStartEvent
  | TimelineChangeEvent
  | TimelineConsolidatedEvent
  | TimelineEndEvent;

// Overall Timeline View Component
const OverallTimelineView = React.memo(
  (props: {
    onPirateClick: (arenaId: number, pirateIndex: number) => void;
    onArenaClick?: (arenaId: number) => void;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
  }): React.ReactElement | null => {
    const { onPirateClick, onArenaClick, scrollContainerRef } = props;

    const roundData = useRoundStore(state => state.roundData);
    const isRoundOver = useIsRoundOver();
    const start = roundData.start;
    const endTime = roundData.timestamp;

    if (!start || !endTime) {
      return null;
    }

    const startDate = new Date(start);
    const endDate = new Date(endTime);
    const changes = roundData.changes || [];
    const winners = roundData.winners || makeEmpty(5);

    // Group changes by timestamp
    const changesByTimestamp = new Map<string, PirateChange[]>();
    changes.forEach(change => {
      // change.pirate is 1-indexed (1-4), convert to 0-indexed for array access
      const pirateIndex = change.pirate - 1;
      const pirateId = roundData.pirates[change.arena]?.[pirateIndex];
      if (!pirateId) {
        return;
      }

      const pirateName = PIRATE_NAMES.get(pirateId);
      const arenaName = ARENA_NAMES[change.arena];

      if (!pirateName || !arenaName) {
        return;
      }

      const timestamp = change.t;
      if (!changesByTimestamp.has(timestamp)) {
        changesByTimestamp.set(timestamp, []);
      }

      changesByTimestamp.get(timestamp)!.push({
        arenaId: change.arena,
        pirateIndex, // Already converted to 0-indexed
        pirateName,
        pirateId,
        arenaName,
        oldOdds: change.old,
        newOdds: change.new,
        isIncrease: change.new > change.old,
      });
    });

    // Build timeline events
    const allTimelineEvents: TimelineEvent[] = [
      {
        id: `start-${startDate.getTime()}`,
        icon: <FaUtensils />,
        title: 'Round Started',
        description: '',
        time: startDate,
        color: 'blue',
        type: 'start' as const,
      },
    ];

    // Add grouped odds changes
    changesByTimestamp.forEach((pirates, timestamp) => {
      const time = new Date(timestamp);
      const hasIncreases = pirates.some(p => p.isIncrease);
      const hasDecreases = pirates.some(p => !p.isIncrease);

      // Determine color and icon based on changes
      let color = 'gray';
      let icon = <FaArrowUp />;

      if (hasIncreases && hasDecreases) {
        color = 'blue';
        icon = <FaWaveSquare />;
      } else if (hasIncreases) {
        color = 'green';
        icon = <FaArrowUp />;
      } else {
        color = 'red';
        icon = <FaArrowDown />;
      }

      // Create title and description
      const firstPirate = pirates[0];
      if (!firstPirate) {
        return;
      }

      const title =
        pirates.length === 1
          ? `${firstPirate.pirateName} - ${firstPirate.arenaName}`
          : `${pirates.length} Pirates Changed`;

      allTimelineEvents.push({
        id: `change-${timestamp}`,
        icon,
        title,
        description: '',
        time,
        color,
        type: 'change' as const,
        pirates,
      });
    });

    // Add round end event if finished
    if (isRoundOver) {
      const winningPirates: WinningPirate[] = [];

      winners.forEach((winningPirateIndex, arenaId) => {
        if (winningPirateIndex > 0) {
          const pirateIndex = winningPirateIndex - 1;
          const pirateId = roundData.pirates[arenaId]?.[pirateIndex];
          const pirateName = pirateId ? PIRATE_NAMES.get(pirateId) : undefined;
          const arenaName = ARENA_NAMES[arenaId];
          const finalOdds = roundData.currentOdds?.[arenaId]?.[winningPirateIndex];

          if (pirateId && pirateName && arenaName && finalOdds) {
            winningPirates.push({
              arenaId,
              pirateIndex,
              pirateName,
              pirateId,
              arenaName,
              finalOdds,
            });
          }
        }
      });

      allTimelineEvents.push({
        id: `end-${endDate.getTime()}`,
        icon: <FaMedal />,
        title: 'Round Ended',
        description: `${winningPirates.length} winning pirate${winningPirates.length !== 1 ? 's' : ''}`,
        time: endDate,
        color: 'purple',
        type: 'end' as const,
        winners: winningPirates,
      });
    }

    // Sort by time
    allTimelineEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Consolidate consecutive single-pirate changes
    const consolidatedEvents = consolidateTimelineEvents(allTimelineEvents);

    return (
      <>
        <DrawerHeader>
          <VStack align="stretch">
            <Flex gap="4" alignItems="center" flexWrap="wrap">
              <Box flex="1" minW="200px">
                <Heading size="lg">
                  <FaChartLine style={{ display: 'inline', marginRight: '12px' }} />
                  All Odds Changes
                </Heading>
                <Text as="i" fontSize="md" color="fg.muted" fontStyle="italic">
                  Round {roundData.round}
                  {' - '}
                  <DateFormatter
                    tz="America/Los_Angeles"
                    format="dddd, MMMM Do YYYY"
                    date={start}
                    withTitle
                    titleFormat="LLL [NST]"
                  />
                </Text>
              </Box>
            </Flex>

            {/* Arena Filter Buttons */}
            {onArenaClick && (
              <Box mt={4} mb={3}>
                <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={2}>
                  View by Arena:
                </Text>
                <Flex gap={2} flexWrap="wrap">
                  <ButtonGroup>
                    {ARENA_NAMES.map((arena, idx) => {
                      const arenaChangesCount = changes.filter(c => c.arena === idx).length;
                      return (
                        <Tooltip
                          content={`${arenaChangesCount} odds change${arenaChangesCount !== 1 ? 's' : ''}`}
                          showArrow
                          placement="top"
                          openDelay={600}
                          key={arena}
                        >
                          <Button
                            key={arena}
                            size="sm"
                            variant="outline"
                            onClick={() => onArenaClick(idx)}
                            disabled={arenaChangesCount === 0}
                          >
                            {arena}
                          </Button>
                        </Tooltip>
                      );
                    })}
                  </ButtonGroup>
                </Flex>
              </Box>
            )}
            <Text
              fontSize="sm"
              fontWeight="bold"
              color="fg.muted"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              <FaClock style={{ display: 'inline', marginRight: '8px' }} />
              Timeline ({changes.length} odds change{changes.length !== 1 ? 's' : ''})
            </Text>
          </VStack>
        </DrawerHeader>

        <DrawerBody ref={scrollContainerRef}>
          <VStack align="stretch">
            <Box>
              <Timeline.Root size="xl" variant="subtle">
                {consolidatedEvents.map(event => (
                  <Timeline.Item key={event.id}>
                    <Timeline.Connector>
                      <Timeline.Separator />
                      <Timeline.Indicator layerStyle="fill.surface" colorPalette={event.color}>
                        {event.icon}
                      </Timeline.Indicator>
                    </Timeline.Connector>
                    <Timeline.Content>
                      <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                        <Box flex="1">
                          <Timeline.Title fontSize="sm" fontWeight="bold" mb={1}>
                            {event.title}
                          </Timeline.Title>
                          <Timeline.Description color="fg.muted" fontSize="sm">
                            <Text fontSize="sm">{event.description}</Text>
                          </Timeline.Description>

                          {/* Consolidated changes (collapsible) */}
                          {event.type === 'consolidated' && (
                            <ConsolidatedChangesContent
                              event={event}
                              onPirateClick={onPirateClick}
                            />
                          )}

                          {/* Regular changes */}
                          {event.type === 'change' && (
                            <RegularChangesContent
                              event={event}
                              onPirateClick={onPirateClick}
                              showArenaName
                            />
                          )}

                          {/* Round ended with winners */}
                          {event.type === 'end' && event.winners && event.winners.length > 0 && (
                            <WinnersContent
                              winners={event.winners}
                              onPirateClick={onPirateClick}
                              showArenaName
                            />
                          )}
                        </Box>
                        <VStack
                          gap={1}
                          minH="100%"
                          align="flex-end"
                          justify="flex-end"
                          alignItems="center"
                        >
                          <Text fontSize="sm" color="fg.muted" fontStyle="italic">
                            <DateFormatter
                              format="LTS [NST]"
                              date={event.time}
                              tz="America/Los_Angeles"
                              withTitle
                              titleFormat="LLL [NST]"
                            />
                          </Text>
                          <Text
                            fontSize="sm"
                            color="fg.muted"
                            fontStyle="italic"
                            hidden={!isRoundOver}
                          >
                            <DateFormatter
                              format="LTS [NST]"
                              date={event.time}
                              tz="America/Los_Angeles"
                              fromNow
                              withTitle
                              titleFormat="LLL [NST]"
                              interval={1}
                            />
                          </Text>
                        </VStack>
                      </Flex>
                    </Timeline.Content>
                  </Timeline.Item>
                ))}
              </Timeline.Root>
            </Box>
          </VStack>
        </DrawerBody>
      </>
    );
  },
);

OverallTimelineView.displayName = 'OverallTimelineView';

// Arena Timeline View Component (shows all pirates in one arena)
const ArenaTimelineView = React.memo(
  (props: {
    arenaId: number;
    onPirateClick: (arenaId: number, pirateIndex: number) => void;
    onBackToOverall: () => void;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
  }): React.ReactElement | null => {
    const { arenaId, onPirateClick, onBackToOverall, scrollContainerRef } = props;

    const roundData = useRoundStore(state => state.roundData);
    const isRoundOver = useIsRoundOver();
    const start = roundData.start;
    const endTime = roundData.timestamp;

    if (!start || !endTime) {
      return null;
    }

    const arenaName = ARENA_NAMES[arenaId];
    const changes = roundData.changes || [];
    const winners = roundData.winners || makeEmpty(5);

    // Filter changes for this arena only
    const arenaChanges = changes.filter(change => change.arena === arenaId);

    // Group changes by timestamp for this arena
    const changesByTimestamp = new Map<string, PirateChange[]>();
    arenaChanges.forEach(change => {
      const pirateIndex = change.pirate - 1;
      const pirateId = roundData.pirates[change.arena]?.[pirateIndex];
      if (!pirateId) {
        return;
      }

      const pirateName = PIRATE_NAMES.get(pirateId);
      if (!pirateName) {
        return;
      }

      const timestamp = change.t;
      if (!changesByTimestamp.has(timestamp)) {
        changesByTimestamp.set(timestamp, []);
      }

      changesByTimestamp.get(timestamp)!.push({
        arenaId: change.arena,
        pirateIndex,
        pirateName,
        pirateId,
        arenaName: arenaName!,
        oldOdds: change.old,
        newOdds: change.new,
        isIncrease: change.new > change.old,
      });
    });

    // Build timeline events for this arena
    const arenaTimelineEvents: TimelineEvent[] = [];

    // Add grouped odds changes
    changesByTimestamp.forEach((pirates, timestamp) => {
      const time = new Date(timestamp);
      const hasIncreases = pirates.some(p => p.isIncrease);
      const hasDecreases = pirates.some(p => !p.isIncrease);

      let color = 'gray';
      let icon = <FaArrowUp />;

      if (hasIncreases && hasDecreases) {
        color = 'blue';
        icon = <FaWaveSquare />;
      } else if (hasIncreases) {
        color = 'green';
        icon = <FaArrowUp />;
      } else {
        color = 'red';
        icon = <FaArrowDown />;
      }

      const firstPirate = pirates[0];
      if (!firstPirate) {
        return;
      }

      const title =
        pirates.length === 1 ? `${firstPirate.pirateName}` : `${pirates.length} Pirates Changed`;

      arenaTimelineEvents.push({
        id: `change-${timestamp}`,
        icon,
        title,
        description: '',
        time,
        color,
        type: 'change' as const,
        pirates,
      });
    });

    // Add round end event if finished
    if (isRoundOver) {
      const winningPirateIndex = winners[arenaId];
      if (winningPirateIndex !== undefined && winningPirateIndex > 0) {
        const pirateIndex = winningPirateIndex - 1;
        const pirateId = roundData.pirates[arenaId]?.[pirateIndex];
        const pirateName = pirateId ? PIRATE_NAMES.get(pirateId) : undefined;
        const finalOdds = roundData.currentOdds?.[arenaId]?.[winningPirateIndex];

        if (pirateId && pirateName && finalOdds) {
          const winningPirate: WinningPirate = {
            arenaId,
            pirateIndex,
            pirateName,
            pirateId,
            arenaName: arenaName!,
            finalOdds,
          };

          arenaTimelineEvents.push({
            id: `end-${endTime}`,
            icon: <FaMedal />,
            title: 'Round Ended',
            description: `${pirateName} won!`,
            time: new Date(endTime),
            color: 'purple',
            type: 'end' as const,
            winners: [winningPirate],
          });
        }
      }
    }

    // Sort by time
    arenaTimelineEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Consolidate consecutive single-pirate changes
    const consolidatedArenaEvents = consolidateTimelineEvents(arenaTimelineEvents);

    return (
      <>
        <DrawerHeader>
          <VStack align="stretch">
            {/* Breadcrumb Navigation */}
            <Breadcrumb.Root size="md" variant="underline" mb={3}>
              <Breadcrumb.List>
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <Button variant="ghost" size="sm" onClick={onBackToOverall}>
                      Round {roundData.round}
                    </Button>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.CurrentLink>{arenaName}</Breadcrumb.CurrentLink>
                </Breadcrumb.Item>
              </Breadcrumb.List>
            </Breadcrumb.Root>

            <Text
              fontSize="sm"
              fontWeight="bold"
              color="fg.muted"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              <FaClock style={{ display: 'inline', marginRight: '8px' }} />
              Timeline ({arenaChanges.length} odds change{arenaChanges.length !== 1 ? 's' : ''})
            </Text>
          </VStack>
        </DrawerHeader>

        <DrawerBody ref={scrollContainerRef}>
          <VStack align="stretch">
            <Box>
              <Timeline.Root size="xl" variant="subtle">
                {consolidatedArenaEvents.map(event => (
                  <Timeline.Item key={event.id}>
                    <Timeline.Connector>
                      <Timeline.Separator />
                      <Timeline.Indicator layerStyle="fill.surface" colorPalette={event.color}>
                        {event.icon}
                      </Timeline.Indicator>
                    </Timeline.Connector>
                    <Timeline.Content>
                      <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                        <Box flex="1">
                          <Timeline.Title fontSize="sm" fontWeight="bold" mb={1}>
                            {event.title}
                          </Timeline.Title>
                          <Timeline.Description color="fg.muted" fontSize="sm">
                            <Text fontSize="sm">{event.description}</Text>
                          </Timeline.Description>

                          {/* Consolidated changes (collapsible) */}
                          {event.type === 'consolidated' && (
                            <ConsolidatedChangesContent
                              event={event}
                              onPirateClick={onPirateClick}
                            />
                          )}

                          {/* Regular changes */}
                          {event.type === 'change' && (
                            <RegularChangesContent event={event} onPirateClick={onPirateClick} />
                          )}

                          {/* Round ended with winner */}
                          {event.type === 'end' && event.winners && event.winners.length > 0 && (
                            <WinnersContent winners={event.winners} onPirateClick={onPirateClick} />
                          )}
                        </Box>
                        <VStack
                          gap={1}
                          minH="100%"
                          align="flex-end"
                          justify="flex-end"
                          alignItems="center"
                        >
                          <Text fontSize="sm" color="fg.muted" fontStyle="italic">
                            <DateFormatter
                              format="LTS [NST]"
                              date={event.time}
                              tz="America/Los_Angeles"
                              withTitle
                              titleFormat="LLL [NST]"
                            />
                          </Text>
                        </VStack>
                      </Flex>
                    </Timeline.Content>
                  </Timeline.Item>
                ))}
              </Timeline.Root>
            </Box>
          </VStack>
        </DrawerBody>
      </>
    );
  },
);

ArenaTimelineView.displayName = 'ArenaTimelineView';

// Individual Pirate Timeline View Component
const PirateTimelineView = React.memo(
  (props: {
    arenaId: number;
    pirateIndex: number;
    onBackToOverall: () => void;
    onBackToArena: (arenaId: number) => void;
  }): React.ReactElement | null => {
    const { arenaId, pirateIndex, onBackToOverall, onBackToArena } = props;

    const roundData = useRoundStore(state => state.roundData);
    const isRoundOver = useIsRoundOver();
    const pirateId = roundData.pirates?.[arenaId]?.[pirateIndex];
    const start = roundData.start;
    const endTime = roundData.timestamp;
    const getPirateBgColor = useGetPirateBgColor();
    const currentOdds = useCurrentOddsValue(arenaId, pirateIndex);
    const openingOdds = useOpeningOddsValue(arenaId, pirateIndex);

    if (!pirateId || !start || !endTime) {
      return null;
    }

    const pirateName = PIRATE_NAMES.get(pirateId)!;
    const arenaName = ARENA_NAMES[arenaId]!;
    const startDate = new Date(start!);
    const endDate = new Date(endTime!);

    const thisPiratesOdds = [openingOdds];
    const thisPiratesChangesTimes = [startDate.getTime()];
    const thisPiratesChanges: OddsChange[] = [];

    const changes = roundData.changes || [];

    // Consolidate odds changes processing for this pirate
    filterChangesByArenaPirate(changes, arenaId, pirateIndex).map(change => {
      thisPiratesOdds.push(change.new);
      thisPiratesChangesTimes.push(new Date(change.t).getTime());
      thisPiratesChanges.push(change);
    });

    const winners = roundData.winners || makeEmpty(5);
    const winningPirate = winners[arenaId] ?? 0;
    const didPirateWin = winningPirate === pirateIndex + 1;

    // Memoized label calculation
    const oddsChangesCountLabel = `${thisPiratesChanges.length} odds change${thisPiratesChanges.length !== 1 ? 's' : ''}`;

    // Enhanced timeline events with more data
    const timelineEvents = [
      {
        id: `start-${startDate.getTime()}`,
        icon: <FaUtensils />,
        title: 'Round Started',
        description: `${pirateName} opened at ${openingOdds}:1`,
        time: startDate,
        odds: openingOdds,
        color: 'blue',
      },
      ...thisPiratesChanges.map((change, index) => {
        const isIncrease = change.new > change.old;

        return {
          id: `change-${change.t}-${index}`,
          icon: isIncrease ? <FaArrowUp /> : <FaArrowDown />,
          title: `${change.old} to ${change.new}`,
          description: `${index + 1}${getOrdinalSuffix(index + 1)} change`,
          time: new Date(change.t),
          odds: change.new,
          color: isIncrease ? 'green' : 'red',
          change: change.new - change.old,
        };
      }),
    ];

    // Add round end event if finished
    if (isRoundOver) {
      timelineEvents.push({
        id: `end-${endDate.getTime()}`,
        icon: didPirateWin ? <FaMedal /> : <FaSkullCrossbones />,
        title: didPirateWin ? '🏆 Pirate Won!' : '💀 Pirate Lost',
        description: didPirateWin
          ? `${pirateName} won ${arenaName}!`
          : `${pirateName} lost ${arenaName}.`,
        time: endDate,
        odds: thisPiratesOdds[thisPiratesOdds.length - 1] || openingOdds,
        color: didPirateWin ? 'green' : 'red',
      });
    }

    return (
      <>
        <DrawerHeader>
          <VStack align="stretch">
            {/* Breadcrumb Navigation */}
            <Breadcrumb.Root size="md" variant="underline" mb={3}>
              <Breadcrumb.List>
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <Button variant="ghost" size="sm" onClick={onBackToOverall}>
                      Round {roundData.round}
                    </Button>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <Button variant="ghost" size="sm" onClick={() => onBackToArena(arenaId)}>
                      {arenaName}
                    </Button>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator />
                <Breadcrumb.Item>
                  <Breadcrumb.CurrentLink>{pirateName}</Breadcrumb.CurrentLink>
                </Breadcrumb.Item>
              </Breadcrumb.List>
            </Breadcrumb.Root>

            <Flex gap="4" alignItems="center" flexWrap="wrap" mb={3}>
              <Box css={avatarWrapperCss} display="inline-block">
                <Avatar
                  name={pirateName}
                  src={`https://images.neopets.com/pirates/fc/fc_pirate_${pirateId}.gif`}
                  size="xl"
                  bg="white"
                  css={ringCss}
                  colorPalette={getPirateBgColor(openingOdds!)}
                />
              </Box>
              <Box flex="1" minW="200px">
                <Flex gap={2} alignItems="center" flexWrap="wrap" mb={0.5}>
                  <Heading size="lg">{pirateName}</Heading>
                  {openingOdds !== undefined && (
                    <Badge
                      variant="subtle"
                      fontSize="sm"
                      colorPalette={getPirateBgColor(openingOdds)}
                      textTransform="uppercase"
                    >
                      Open {openingOdds}:1
                    </Badge>
                  )}
                  {currentOdds !== undefined && currentOdds !== openingOdds && (
                    <Badge
                      variant="subtle"
                      fontSize="sm"
                      colorPalette={getPirateBgColor(currentOdds)}
                      textTransform="uppercase"
                    >
                      Current {currentOdds}:1
                    </Badge>
                  )}
                </Flex>
                {oddsChangesCountLabel && (
                  <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                    {oddsChangesCountLabel}
                  </Text>
                )}
              </Box>
            </Flex>
            <Text
              fontSize="sm"
              fontWeight="bold"
              color="fg.muted"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              <FaClock style={{ display: 'inline', marginRight: '8px' }} />
              Timeline
            </Text>
          </VStack>
        </DrawerHeader>

        <DrawerBody>
          <VStack align="stretch">
            <Box>
              <Timeline.Root size="xl" variant="subtle">
                {timelineEvents.map(event => (
                  <Timeline.Item key={event.id}>
                    <Timeline.Connector>
                      <Timeline.Separator />
                      <Timeline.Indicator layerStyle="fill.surface" colorPalette={event.color}>
                        {event.icon}
                      </Timeline.Indicator>
                    </Timeline.Connector>
                    <Timeline.Content>
                      <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                        <Box>
                          <Timeline.Title fontSize="sm" fontWeight="bold" mb={1}>
                            {event.title}
                          </Timeline.Title>
                          <Timeline.Description color="fg.muted" fontSize="sm">
                            <Text fontSize="sm">{event.description}</Text>
                          </Timeline.Description>
                        </Box>
                        <Spacer />
                        <VStack
                          gap={1}
                          minH="100%"
                          align="flex-end"
                          justify="flex-end"
                          alignItems="center"
                        >
                          <Text fontSize="sm" color="fg.muted" fontStyle="italic">
                            <DateFormatter
                              format="LTS [NST]"
                              date={event.time}
                              tz="America/Los_Angeles"
                              withTitle
                              titleFormat="LLL [NST]"
                            />
                          </Text>
                          <Text
                            fontSize="sm"
                            color="fg.muted"
                            fontStyle="italic"
                            hidden={!isRoundOver}
                          >
                            <DateFormatter
                              format="LTS [NST]"
                              date={event.time}
                              tz="America/Los_Angeles"
                              fromNow
                              withTitle
                              titleFormat="LLL [NST]"
                              interval={1}
                            />
                          </Text>
                        </VStack>
                      </Flex>
                    </Timeline.Content>
                  </Timeline.Item>
                ))}
              </Timeline.Root>
            </Box>
          </VStack>
        </DrawerBody>
      </>
    );
  },
);

PirateTimelineView.displayName = 'PirateTimelineView';

// Main TimelineContent component that manages all three views
const TimelineContent = React.memo(
  (props: { arenaId: number | null; pirateIndex: number | null }): React.ReactElement | null => {
    const { arenaId: initialArenaId, pirateIndex: initialPirateIndex } = props;

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const {
      view,
      selectedArena,
      selectedPirate,
      handleArenaClick: baseHandleArenaClick,
      handlePirateClick: baseHandlePirateClick,
      handleBackToOverall,
      handleBackToArena,
    } = useTimelineViewState({
      initialArenaId,
      initialPirateIndex,
    });

    // Save scroll position before navigating
    const saveScrollPosition = useScrollPosition(
      view === 'overall' || view === 'arena',
      scrollContainerRef,
    );

    // Wrap handlers to save scroll position
    const handleArenaClick = useCallback(
      (arenaId: number) => {
        saveScrollPosition();
        baseHandleArenaClick(arenaId);
      },
      [saveScrollPosition, baseHandleArenaClick],
    );

    const handlePirateClick = useCallback(
      (arenaId: number, pirateIndex: number) => {
        saveScrollPosition();
        baseHandlePirateClick(arenaId, pirateIndex);
      },
      [saveScrollPosition, baseHandlePirateClick],
    );

    if (view === 'overall') {
      return (
        <OverallTimelineView
          onPirateClick={handlePirateClick}
          onArenaClick={handleArenaClick}
          scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
        />
      );
    }

    if (view === 'arena' && selectedArena !== null) {
      return (
        <ArenaTimelineView
          arenaId={selectedArena}
          onPirateClick={handlePirateClick}
          onBackToOverall={handleBackToOverall}
          scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
        />
      );
    }

    if (view === 'pirate' && selectedPirate) {
      return (
        <PirateTimelineView
          arenaId={selectedPirate.arenaId}
          pirateIndex={selectedPirate.pirateIndex}
          onBackToOverall={handleBackToOverall}
          onBackToArena={handleBackToArena}
        />
      );
    }

    return null;
  },
);

TimelineContent.displayName = 'TimelineContent';

export default TimelineContent;
