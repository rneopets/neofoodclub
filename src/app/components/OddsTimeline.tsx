import { Box, Table } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { useRoundStore } from '../stores';
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

  // If there's no duration (brand new round), just show equal segments
  if (totalDuration === 0) {
    const equalPercent = 100 / timestamps.length;
    return timestamps.map(() => equalPercent);
  }

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

    const palettes = [
      'cyan',
      'green',
      'blue',
      'purple',
      'orange',
      'red',
      'yellow',
      'gray',
      'pink',
    ] as const;

    let label = `${odds} (${index}${getOrdinalSuffix(index)} change)`;

    if (index === 0) {
      label = `${odds} (Opening Odds)`;
    }

    return (
      <Tooltip content={label} showArrow placement="top">
        <Box
          width={`${percent}%`}
          whiteSpace="nowrap"
          overflow="hidden"
          fontSize="xs"
          layerStyle="fill.muted"
          colorPalette={palettes[odds % (palettes.length - 1)]}
          fontWeight="semibold"
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

    const roundData = useRoundStore(state => state.roundData);
    const openingOdds = roundData?.openingOdds?.[arenaId]?.[pirateIndex + 1];
    const start = roundData?.start;
    const lastChange = roundData?.lastChange;

    // Calculate timeline data
    const startDate = useMemo(() => new Date(start as string), [start]);
    const changes = useMemo(() => roundData.changes || [], [roundData.changes]);

    // Get pirate odds history
    const timelineData = useMemo(() => {
      // Start with opening odds
      const odds = [openingOdds as number];
      const times = [startDate.getTime()];

      // Add all odds changes for this pirate
      const pirateChanges = filterChangesByArenaPirate(changes, arenaId, pirateIndex);
      pirateChanges.forEach(change => {
        odds.push(change.new);
        times.push(new Date(change.t).getTime());
      });

      // For end time: use the last change time for this pirate if available,
      // otherwise use lastChange, otherwise use start (no timeline growth)
      let endTime: number;
      if (pirateChanges.length > 0) {
        // This pirate has changes, use the last one
        endTime = times[times.length - 1] ?? startDate.getTime();
      } else if (lastChange) {
        // No changes for this pirate, but other pirates changed
        endTime = new Date(lastChange).getTime();
      } else {
        // Brand new round, no changes at all - use start time (100% bar at a point)
        endTime = startDate.getTime();
      }

      // Calculate width percentages
      const percentages = calculatePercentages(times, endTime);

      return { odds, percentages, times };
    }, [openingOdds, startDate, changes, arenaId, pirateIndex, lastChange]);

    if (!openingOdds || !start) {
      return <Box>&nbsp;</Box>;
    }

    return (
      <Table.Cell p={0}>
        <Box
          maxW="300px"
          onClick={onClick}
          cursor="pointer"
          display="flex"
          px="0"
          rounded="lg"
          overflow="hidden"
          borderRadius="md"
          border="1px solid"
          borderColor="border"
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
