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
  Separator,
  Card,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import React from 'react';
import {
  FaSackDollar,
  FaUtensils,
  FaSkullCrossbones,
  FaArrowUp,
  FaArrowDown,
  FaChartLine,
  FaPercent,
  FaClock,
  FaMedal,
} from 'react-icons/fa6';

import { OddsChange } from '../../types';
import { PIRATE_NAMES, ARENA_NAMES } from '../constants';
import { makeEmpty } from '../maths';
import {
  useRoundDataStore,
  useStableUsedProbability,
  useStableLogitProbability,
  useStableLegacyProbabilityStd,
  useArenaRatios,
} from '../stores';
import { displayAsPlusMinus, displayAsPercent } from '../util';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../utils/betUtils';

import DateFormatter from './DateFormatter';

import { Avatar } from '@/components/ui/avatar';
import { useColorModeValue } from '@/components/ui/color-mode';
import { Timeline } from '@/components/ui/timeline';

// TimelineContent component for the drawer
const TimelineContent = React.memo(
  (props: { arenaId: number; pirateIndex: number }): React.ReactElement | null => {
    const { arenaId, pirateIndex } = props;

    const roundData = useRoundDataStore(state => state.roundState.roundData);
    const useLogitModel = useRoundDataStore(
      state => state.roundState.advanced?.useLogitModel ?? false,
    );
    const pirateId = roundData.pirates?.[arenaId]?.[pirateIndex];
    const start = roundData.start;
    const endTime = roundData.timestamp;

    // Get probability data
    const currentProb = useStableUsedProbability(arenaId, pirateIndex + 1);
    const logitProb = useStableLogitProbability(arenaId, pirateIndex + 1);
    const legacyProb = useStableLegacyProbabilityStd(arenaId, pirateIndex + 1);
    const arenaRatios = useArenaRatios();

    // Color mode values - must be at top level
    const cardBg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const mutedText = useColorModeValue('gray.600', 'gray.400');
    const detailsBg = useColorModeValue('gray.50', 'gray.700');

    if (!pirateId || !start || !endTime) {
      return null;
    }

    const pirateName = PIRATE_NAMES.get(pirateId) as string;
    const arenaName = ARENA_NAMES[arenaId] || `Arena ${arenaId + 1}`;
    const openingOdds = roundData.openingOdds?.[arenaId]?.[pirateIndex + 1] as number;
    const currentOdds = roundData.currentOdds?.[arenaId]?.[pirateIndex + 1] as number;
    const startDate = new Date(start as string);
    const endDate = new Date(endTime as string);

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

    const _arenaPirates = roundData.pirates[arenaId] as number[];
    const winners = roundData.winners || makeEmpty(5);
    const winningPirate = winners[arenaId] ?? 0;
    const isRoundOver = winningPirate > 0;
    const didPirateWin = winningPirate === pirateIndex + 1;

    // Calculate statistics
    const totalOddsChange = currentOdds - openingOdds;
    const percentageChange = ((currentOdds - openingOdds) / openingOdds) * 100;
    const volatility = thisPiratesChanges.length;
    const currentPayout = currentOdds * currentProb - 1;
    const openingPayout = openingOdds * currentProb - 1;
    const payoutChange = currentPayout - openingPayout;
    const arenaRatio = arenaRatios[arenaId] || 0;

    // Memoized label calculation
    const oddsChangesCountLabel =
      thisPiratesChanges.length === 0
        ? ''
        : ` - ${thisPiratesChanges.length} odds change${thisPiratesChanges.length > 1 ? 's' : ''}`;

    // Enhanced timeline events with more data
    const timelineEvents = [
      {
        id: `start-${startDate.getTime()}`,
        icon: <FaUtensils />,
        title: 'Round Started',
        description: `${pirateName} opened at ${openingOdds}:1`,
        details: [
          `Win Probability: ${displayAsPercent(currentProb, 1)}`,
          `Opening Payout: ${displayAsPlusMinus(openingPayout)} ratio`,
          `Arena ${arenaName} ratio: ${arenaRatio.toFixed(2)}`,
        ],
        time: startDate,
        odds: openingOdds,
        color: 'blue.500',
        payout: openingPayout,
      },
      ...thisPiratesChanges.map((change, index) => {
        const isIncrease = change.new > change.old;
        const changePercent = ((change.new - change.old) / change.old) * 100;
        const newPayout = change.new * currentProb - 1;
        const oldPayout = change.old * currentProb - 1;
        const payoutDiff = newPayout - oldPayout;

        return {
          id: `change-${change.t}-${index}`,
          icon: isIncrease ? <FaArrowUp /> : <FaArrowDown />,
          title: `Odds ${isIncrease ? 'Increased' : 'Decreased'} to ${change.new}:1`,
          description: `${displayAsPlusMinus(change.new - change.old)} change (${getOrdinalSuffix(index + 1)} change)`,
          details: [
            `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}% odds change`,
            `Payout ratio: ${displayAsPlusMinus(payoutDiff)}`,
            `New expected return: ${displayAsPlusMinus(newPayout)}`,
          ],
          time: new Date(change.t),
          odds: change.new,
          color: isIncrease ? 'green.500' : 'red.500',
          payout: newPayout,
          change: change.new - change.old,
          changePercent,
        };
      }),
    ];

    // Add round end event if finished
    if (isRoundOver) {
      const finalPayout = currentOdds * currentProb - 1;
      timelineEvents.push({
        id: `end-${endDate.getTime()}`,
        icon: didPirateWin ? <FaMedal /> : <FaSkullCrossbones />,
        title: didPirateWin ? '🏆 Pirate Won!' : '💀 Pirate Lost',
        description: didPirateWin
          ? `${pirateName} was the winner of ${arenaName}!`
          : `${pirateName} did not win ${arenaName}`,
        details: didPirateWin
          ? [
              `Final odds: ${currentOdds}:1`,
              `Winning payout achieved!`,
              `Total odds change: ${displayAsPlusMinus(totalOddsChange)}`,
            ]
          : [
              `Final odds: ${currentOdds}:1`,
              `Better luck next time`,
              `Total odds change: ${displayAsPlusMinus(totalOddsChange)}`,
            ],
        time: endDate,
        odds: thisPiratesOdds[thisPiratesOdds.length - 1] || openingOdds,
        color: didPirateWin ? 'green.500' : 'red.500',
        payout: finalPayout,
      });
    }

    return (
      <>
        <DrawerHeader pb={4}>
          <VStack gap={4} align="stretch">
            <Flex gap="4" alignItems="center" flexWrap="wrap">
              <Avatar
                name={pirateName}
                src={`https://images.neopets.com/pirates/fc/fc_pirate_${pirateId}.gif`}
                size="lg"
              />
              <Box flex="1" minW="200px">
                <Heading size="lg" mb={1}>
                  {pirateName} {oddsChangesCountLabel}
                </Heading>
                <Text color={mutedText} fontSize="md" mb={2}>
                  {arenaName} • Round {roundData.round}
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Badge
                    colorPalette={
                      didPirateWin
                        ? 'green'
                        : totalOddsChange > 0
                          ? 'green'
                          : totalOddsChange < 0
                            ? 'red'
                            : 'gray'
                    }
                  >
                    {currentOdds}:1 odds
                  </Badge>
                  <Badge colorPalette={currentPayout > 0 ? 'green' : 'red'}>
                    {displayAsPlusMinus(currentPayout)} payout
                  </Badge>
                  <Badge colorPalette="blue">{displayAsPercent(currentProb, 1)} chance</Badge>
                </HStack>
              </Box>
            </Flex>

            {/* Summary Stats */}
            <Card.Root bg={cardBg} borderColor={borderColor}>
              <Card.Body py={3}>
                <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={4}>
                  <GridItem>
                    <VStack gap={1}>
                      <HStack>
                        <FaChartLine color={totalOddsChange >= 0 ? 'green' : 'red'} />
                        <Text fontSize="xs" fontWeight="bold" color={mutedText}>
                          TOTAL CHANGE
                        </Text>
                      </HStack>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={totalOddsChange >= 0 ? 'green.500' : 'red.500'}
                      >
                        {displayAsPlusMinus(totalOddsChange)}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {percentageChange > 0 ? '+' : ''}
                        {percentageChange.toFixed(1)}%
                      </Text>
                    </VStack>
                  </GridItem>

                  <GridItem>
                    <VStack gap={1}>
                      <HStack>
                        <FaPercent color="blue" />
                        <Text fontSize="xs" fontWeight="bold" color={mutedText}>
                          PROBABILITY
                        </Text>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold">
                        {displayAsPercent(useLogitModel ? logitProb : legacyProb, 1)}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {useLogitModel ? 'Logit' : 'Legacy'} model
                      </Text>
                    </VStack>
                  </GridItem>

                  <GridItem>
                    <VStack gap={1}>
                      <HStack>
                        <FaClock color="orange" />
                        <Text fontSize="xs" fontWeight="bold" color={mutedText}>
                          VOLATILITY
                        </Text>
                      </HStack>
                      <Text fontSize="lg" fontWeight="bold">
                        {volatility}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        {volatility === 0
                          ? 'Stable'
                          : volatility === 1
                            ? 'Low'
                            : volatility < 4
                              ? 'Medium'
                              : 'High'}
                      </Text>
                    </VStack>
                  </GridItem>

                  <GridItem>
                    <VStack gap={1}>
                      <HStack>
                        <FaSackDollar color={payoutChange >= 0 ? 'green' : 'red'} />
                        <Text fontSize="xs" fontWeight="bold" color={mutedText}>
                          PAYOUT CHANGE
                        </Text>
                      </HStack>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={payoutChange >= 0 ? 'green.500' : 'red.500'}
                      >
                        {displayAsPlusMinus(payoutChange)}
                      </Text>
                      <Text fontSize="xs" color={mutedText}>
                        Expected return
                      </Text>
                    </VStack>
                  </GridItem>
                </Grid>
              </Card.Body>
            </Card.Root>
          </VStack>
        </DrawerHeader>

        <DrawerBody>
          <VStack gap={4} align="stretch">
            <Box>
              <Text
                fontSize="sm"
                fontWeight="bold"
                color={mutedText}
                mb={3}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                <FaClock style={{ display: 'inline', marginRight: '8px' }} />
                Timeline •{' '}
                <DateFormatter tz="America/Los_Angeles" format="dddd, MMMM Do YYYY" date={start} />
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
                      <VStack align="start" gap={2}>
                        <Box>
                          <Timeline.Title fontSize="md" fontWeight="bold" mb={1}>
                            {event.title}
                          </Timeline.Title>
                          <Timeline.Description color={mutedText} fontSize="sm" mb={2}>
                            <DateFormatter
                              format="LTS [NST]"
                              date={event.time}
                              tz="America/Los_Angeles"
                            />
                          </Timeline.Description>
                          <Text fontSize="sm" mb={2}>
                            {event.description}
                          </Text>
                        </Box>

                        {event.details && event.details.length > 0 && (
                          <Box
                            bg={detailsBg}
                            p={3}
                            borderRadius="md"
                            width="100%"
                            borderLeft="3px solid"
                            borderColor={event.color}
                          >
                            <VStack align="start" gap={1}>
                              {event.details.map(detail => (
                                <Text
                                  key={`${event.id}-detail-${detail.slice(0, 20)}`}
                                  fontSize="xs"
                                  color={mutedText}
                                  fontFamily="mono"
                                >
                                  • {detail}
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}

                        <Box pt={2}>
                          <Separator />
                        </Box>
                      </VStack>
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
