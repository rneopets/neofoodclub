import {
  Box,
  Icon,
  DrawerHeader,
  DrawerBody,
  Flex,
  Avatar,
  Stack,
  StackDivider,
  Spacer,
  VStack,
  Heading,
  Text,
  Circle,
} from '@chakra-ui/react';
import React from 'react';
import { FaSackDollar, FaUtensils, FaSkullCrossbones } from 'react-icons/fa6';

import { OddsChange } from '../../types';
import { PIRATE_NAMES } from '../constants';
import { makeEmpty } from '../maths';
import { useRoundDataStore } from '../stores';
import { displayAsPlusMinus } from '../util';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../utils/betUtils';

import DateFormatter from './DateFormatter';

// TimelineContent component for the drawer
const TimelineContent = React.memo(
  (props: { arenaId: number; pirateIndex: number }): React.ReactElement | null => {
    const { arenaId, pirateIndex } = props;

    const roundData = useRoundDataStore(state => state.roundState.roundData);
    const pirateId = roundData.pirates?.[arenaId]?.[pirateIndex];
    const start = roundData.start;
    const endTime = roundData.timestamp;

    if (!pirateId || !start || !endTime) {
      return null;
    }

    const pirateName = PIRATE_NAMES.get(pirateId) as string;
    const openingOdds = roundData.openingOdds?.[arenaId]?.[pirateIndex + 1] as number;
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

    const arenaPirates = roundData.pirates[arenaId] as number[];
    const winners = roundData.winners || makeEmpty(5);
    const winningPirate = winners[arenaId] ?? 0;
    const isRoundOver = winningPirate > 0;
    const didPirateWin = winningPirate === pirateIndex + 1;

    let oddsChangesCountLabel = '';

    if (thisPiratesChanges.length > 0) {
      oddsChangesCountLabel = ` - ${thisPiratesChanges.length} odds change`;
      if (thisPiratesChanges.length > 1) {
        oddsChangesCountLabel += 's';
      }
    }

    return (
      <>
        <DrawerHeader>
          <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
            <Avatar
              name={pirateName}
              src={`https://images.neopets.com/pirates/fc/fc_pirate_${pirateId}.gif`}
            />
            <Box>
              <Heading size="sm">
                {pirateName} {oddsChangesCountLabel}
              </Heading>
              <Text as="i" fontSize="md">
                Round {roundData.round}
                {' - '}
                <DateFormatter tz="America/Los_Angeles" format="dddd, MMMM Do YYYY" date={start} />
              </Text>
            </Box>
          </Flex>
        </DrawerHeader>

        <DrawerBody>
          <Stack divider={<StackDivider />} spacing="4">
            <Box>
              <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                <Box
                  bg="blue.500"
                  borderRadius="full"
                  width="2.5rem"
                  height="2.5rem"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={FaUtensils} boxSize={6} color="white" />
                </Box>
                <Box>
                  <Heading size="sm">
                    Round started{' - '}
                    <DateFormatter format="LTS [NST]" date={startDate} tz="America/Los_Angeles" />
                  </Heading>
                  <Text as="i">
                    {pirateName} opened at {openingOdds}:1
                  </Text>
                </Box>
              </Flex>
            </Box>
            {thisPiratesChanges.map((change, i) => {
              const wentUp = change.new > change.old;
              return (
                <Box key={`change-${change.t}-${change.pirate}-${change.arena}`}>
                  <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap" paddingLeft={'2px'}>
                    <Circle size={9} bg={wentUp ? 'tomato' : 'green.500'} color="white">
                      <Text fontSize="md" as="b">
                        {displayAsPlusMinus(change.new - change.old)}
                      </Text>
                    </Circle>
                    <Box>
                      <Heading size="sm">
                        {change.old} to {change.new}
                      </Heading>
                      <Text fontSize="xs">
                        {i + 1}
                        {getOrdinalSuffix(i + 1)} change
                      </Text>
                    </Box>
                    <Spacer />

                    <VStack spacing={0}>
                      <Text as="i" fontSize="xs">
                        <DateFormatter
                          format="LTS [NST]"
                          date={change.t}
                          withTitle
                          titleFormat="LLL [NST]"
                        />
                      </Text>
                      <Text as="i" fontSize="xs" hidden={isRoundOver}>
                        <DateFormatter
                          format="llll [NST]"
                          date={change.t}
                          fromNow
                          withTitle
                          titleFormat="LLL [NST]"
                          interval={1}
                        />
                      </Text>
                    </VStack>
                  </Flex>
                </Box>
              );
            })}
            {isRoundOver ? (
              <>
                <Box>
                  <Flex flex="1" gap="4" alignItems="center" flexWrap="wrap">
                    <Circle size={10} bg={didPirateWin ? 'green.500' : 'tomato'}>
                      <Icon
                        boxSize={6}
                        color="white"
                        as={didPirateWin ? FaSackDollar : FaSkullCrossbones}
                      />
                    </Circle>
                    <Box>
                      <Heading size="sm">
                        Round Over{' - '}
                        <DateFormatter format="LTS [NST]" date={endDate} tz="America/Los_Angeles" />
                      </Heading>
                      <Stack spacing={0}>
                        <Text as="i">
                          {pirateName}{' '}
                          {didPirateWin
                            ? 'Won!'
                            : `lost to ${
                                PIRATE_NAMES.get(
                                  arenaPirates[winningPirate - 1] as number,
                                ) as string
                              }`}
                        </Text>
                        <Text as="i">
                          <DateFormatter
                            format="dddd, MMMM Do YYYY"
                            date={endDate}
                            tz="America/Los_Angeles"
                          />
                        </Text>
                      </Stack>
                    </Box>
                  </Flex>
                </Box>
              </>
            ) : null}
          </Stack>
        </DrawerBody>
      </>
    );
  },
);

TimelineContent.displayName = 'TimelineContent';

export default TimelineContent;
