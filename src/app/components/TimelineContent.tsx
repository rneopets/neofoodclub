import {
  Box,
  DrawerHeader,
  DrawerBody,
  Flex,
  Heading,
  Text,
  Badge,
  VStack,
  HStack,
  Card,
  Grid,
  GridItem,
  Spacer,
} from '@chakra-ui/react';
import React from 'react';
import {
  FaUtensils,
  FaSkullCrossbones,
  FaArrowUp,
  FaArrowDown,
  FaPercent,
  FaClock,
  FaMedal,
} from 'react-icons/fa6';

import { OddsChange } from '../../types';
import { PIRATE_NAMES, ARENA_NAMES } from '../constants';
import { useBgColors } from '../hooks/useBgColors';
import { makeEmpty } from '../maths';
import {
  useRoundDataStore,
  useStableLogitProbability,
  useStableLegacyProbabilityStd,
} from '../stores';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../utils/betUtils';

import DateFormatter from './DateFormatter';

import { Avatar } from '@/components/ui/avatar';
import { Timeline } from '@/components/ui/timeline';

// TimelineContent component for the drawer
const TimelineContent = React.memo(
  (props: { arenaId: number; pirateIndex: number }): React.ReactElement | null => {
    const { arenaId, pirateIndex } = props;

    const roundData = useRoundDataStore(state => state.roundState.roundData);
    const pirateId = roundData.pirates?.[arenaId]?.[pirateIndex];
    const start = roundData.start;
    const endTime = roundData.timestamp;

    // Get probability data
    const logitProb = useStableLogitProbability(arenaId, pirateIndex + 1);
    const legacyProb = useStableLegacyProbabilityStd(arenaId, pirateIndex + 1);

    // Background colors using semantic tokens
    const bgColors = useBgColors();

    if (!pirateId || !start || !endTime) {
      return null;
    }

    const pirateName = PIRATE_NAMES.get(pirateId)!;
    const arenaName = ARENA_NAMES[arenaId]!;
    const openingOdds = roundData.openingOdds?.[arenaId]?.[pirateIndex + 1] as number;
    const currentOdds = roundData.currentOdds?.[arenaId]?.[pirateIndex + 1] as number;
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
    const isRoundOver = winningPirate > 0;
    const didPirateWin = winningPirate === pirateIndex + 1;

    // Memoized label calculation
    const oddsChangesCountLabel =
      thisPiratesChanges.length === 0
        ? ''
        : ` • ${thisPiratesChanges.length} odds change${thisPiratesChanges.length > 1 ? 's' : ''}`;

    // Enhanced timeline events with more data
    const timelineEvents = [
      {
        id: `start-${startDate.getTime()}`,
        icon: <FaUtensils />,
        title: 'Round Started',
        description: `${pirateName} opened at ${openingOdds}:1`,
        time: startDate,
        odds: openingOdds,
        color: 'blue.solid',
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
          color: isIncrease ? 'green.solid' : 'red.solid',
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
          ? `${pirateName} was the winner of ${arenaName}!`
          : `${pirateName} did not win ${arenaName}`,
        time: endDate,
        odds: thisPiratesOdds[thisPiratesOdds.length - 1] || openingOdds,
        color: didPirateWin ? 'green.solid' : 'red.solid',
      });
    }

    return (
      <>
        <DrawerHeader>
          <VStack align="stretch">
            <Flex gap="4" alignItems="center" flexWrap="wrap">
              <Avatar
                name={pirateName}
                src={`https://images.neopets.com/pirates/fc/fc_pirate_${pirateId}.gif`}
                size="xl"
              />
              <Box flex="1" minW="200px">
                <Heading size="lg">
                  {pirateName} {oddsChangesCountLabel}
                </Heading>
                <Text as="i" fontSize="md" color={bgColors.textMuted} fontStyle="italic">
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
            {/* TODO: Summary Stats */}
            {/* https://chakra-ui.com/docs/charts/donut-chart#detached-segment */}
            {/* <Card.Root bg={bgColors.canvas} borderColor={bgColors.border}>
              <Card.Body py={3}>
                <Grid gap={4} templateColumns="repeat(2, 1fr)">
                  <GridItem colSpan={2}>
                    <HStack gap={2} justifyContent="center">
                      <FaPercent />
                      <Text fontWeight="bold" fontSize="lg">
                        Probabilities
                      </Text>
                    </HStack>
                  </GridItem>
                  <GridItem>
                    <VStack gap={1}>
                      <Text fontSize="lg" fontWeight="bold">
                        {displayAsPercent(legacyProb, 1)}
                      </Text>
                      <Text fontSize="xs" color={bgColors.textMuted}>
                        Legacy model
                      </Text>
                    </VStack>
                  </GridItem>
                  <GridItem>
                    <VStack gap={1}>
                      <Text fontSize="lg" fontWeight="bold">
                        {displayAsPercent(logitProb, 1)}
                      </Text>
                      <Text fontSize="xs" color={bgColors.textMuted}>
                        Logit model
                      </Text>
                    </VStack>
                  </GridItem>
                </Grid>
              </Card.Body>
            </Card.Root> */}
          </VStack>
        </DrawerHeader>

        <DrawerBody>
          <VStack align="stretch">
            <Box>
              <Text
                fontSize="sm"
                fontWeight="bold"
                color={bgColors.textMuted}
                mb={3}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                <FaClock style={{ display: 'inline', marginRight: '8px' }} />
                Timeline
              </Text>

              <Timeline.Root size="lg" variant="subtle">
                {timelineEvents.map(event => (
                  <Timeline.Item key={event.id}>
                    <Timeline.Connector>
                      <Timeline.Separator />
                      <Timeline.Indicator bg={event.color} color="white">
                        {event.icon}
                      </Timeline.Indicator>
                    </Timeline.Connector>
                    <Timeline.Content>
                      <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                        <Box>
                          <Timeline.Title fontSize="sm" fontWeight="bold" mb={1}>
                            {event.title}
                          </Timeline.Title>
                          <Timeline.Description color={bgColors.textMuted} fontSize="sm">
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
                          <Text fontSize="sm" color={bgColors.textMuted} fontStyle="italic">
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
                            color={bgColors.textMuted}
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

TimelineContent.displayName = 'TimelineContent';

export default TimelineContent;
