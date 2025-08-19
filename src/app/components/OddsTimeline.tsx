import { Box, Table } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { useRoundDataStore } from '../stores';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../utils/betUtils';

import { Tooltip } from '@/components/ui/tooltip';

/**
 * Calculate the percentage width for each timeline segment
 */
function calculatePercentages(timestamps: number[], endTime: number): number[] {
  if (timestamps.length === 0) {
    return [];
  }

  const percentages: number[] = [];
  const startTime = timestamps[0] as number;
  const totalDuration = endTime - startTime;

  timestamps.forEach((timestamp: number, i: number) => {
    const currentTime = timestamp;
    const nextTime = i === timestamps.length - 1 ? endTime : (timestamps[i + 1] as number);
    const segmentDuration = nextTime - currentTime;
    const segmentPercentage = (segmentDuration / totalDuration) * 100;
    percentages.push(segmentPercentage);
  });

  return percentages;
}

/**
 * Individual bar in the timeline representing a specific odds value
 */
const TimelineBar = React.memo(
  (props: {
    index: number;
    odds: number;
    percent: number;
    timestamp: number;
  }): React.ReactElement => {
    const { index, odds, percent, timestamp } = props;

    const colors = ['cyan', 'green', 'blue', 'purple', 'orange', 'red', 'yellow', 'gray', 'pink'];

    let label = `${odds} (${index}${getOrdinalSuffix(index)} change)`;

    if (index === 0) {
      label = `${odds} (Opening Odds)`;
    }

    return (
      <Tooltip content={label} showArrow placement="top">
        <Box
          width={`${percent}%`}
          bgColor={`${colors[odds % (colors.length - 1)]}.500`}
          whiteSpace="nowrap"
          overflow="hidden"
          fontSize="xs"
          color="white"
          fontWeight="bold"
          textAlign="center"
          minH="6"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          data-timestamp={timestamp}
        >
          {percent > 8 ? odds : '\u00A0'}
        </Box>
      </Tooltip>
    );
  },
);

TimelineBar.displayName = 'TimelineBar';

interface OddsTimelineProps {
  onClick: () => void;
  arenaId: number;
  pirateIndex: number;
}

/**
 * Timeline component that shows odds changes over time
 */
const OddsTimeline = React.memo(
  (props: OddsTimelineProps): React.ReactElement => {
    const { onClick, arenaId, pirateIndex } = props;

    const roundData = useRoundDataStore(state => state.roundState.roundData);
    const openingOdds = roundData?.openingOdds?.[arenaId]?.[pirateIndex + 1];
    const start = roundData?.start;
    const endTime = roundData?.timestamp;

    // Calculate timeline data
    const startDate = useMemo(() => new Date(start as string), [start]);
    const endTimeDate = useMemo(() => new Date(endTime as string), [endTime]);
    const changes = useMemo(() => roundData.changes || [], [roundData.changes]);

    // Get pirate odds history
    const timelineData = useMemo(() => {
      // Start with opening odds
      const odds = [openingOdds as number];
      const times = [startDate.getTime()];

      // Add all odds changes for this pirate
      filterChangesByArenaPirate(changes, arenaId, pirateIndex).forEach(change => {
        odds.push(change.new);
        times.push(new Date(change.t).getTime());
      });

      // Calculate width percentages
      const percentages = calculatePercentages(times, endTimeDate.getTime());

      return { odds, percentages, times };
    }, [openingOdds, startDate, changes, arenaId, pirateIndex, endTimeDate]);

    if (!openingOdds || !start || !endTime) {
      return <Box>&nbsp;</Box>;
    }

    return (
      <Table.Cell p={0}>
        <Box
          maxW="300px"
          onClick={onClick}
          cursor="pointer"
          display="flex"
          borderRadius="md"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
        >
          {timelineData.odds.map((odds, i) => (
            <TimelineBar
              key={`timeline-${arenaId}-${pirateIndex}-${timelineData.times[i]}-${odds}`}
              index={i}
              odds={odds}
              percent={timelineData.percentages[i] ?? 0}
              timestamp={timelineData.times[i] ?? 0}
            />
          ))}
        </Box>
      </Table.Cell>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId && prevProps.pirateIndex === nextProps.pirateIndex,
);

OddsTimeline.displayName = 'OddsTimeline';

export default OddsTimeline;
