import { Box, Td, Tooltip } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { useRoundDataStore } from '../stores';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../utils/betUtils';

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
  (props: { index: number; odds: number; percent: number }): React.ReactElement => {
    const { index, odds, percent } = props;

    const colors = ['cyan', 'green', 'blue', 'purple', 'orange', 'red', 'yellow', 'gray', 'pink'];

    let label = `${odds} (${index}${getOrdinalSuffix(index)} change)`;

    if (index === 0) {
      label = `${odds} (Opening Odds)`;
    }

    return (
      <Tooltip label={label}>
        <Box
          width={`${percent}%`}
          bgColor={`${colors[odds % (colors.length - 1)]}.500`}
          whiteSpace="nowrap"
          overflow="hidden"
          fontSize="xs"
        >
          &nbsp;{odds}
        </Box>
      </Tooltip>
    );
  },
);

TimelineBar.displayName = 'TimelineBar';

/**
 * Timeline component that shows odds changes over time
 */
const OddsTimeline = React.memo(
  (props: { onClick: () => void; arenaId: number; pirateIndex: number }): React.ReactElement => {
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

      return { odds, percentages };
    }, [openingOdds, startDate, changes, arenaId, pirateIndex, endTimeDate]);

    if (!openingOdds || !start || !endTime) {
      return <Box>&nbsp;</Box>;
    }

    return (
      <Td p={0}>
        <Box maxW="300px" onClick={onClick} cursor="pointer" display="flex">
          {timelineData.odds.map((odds, i) => (
            <TimelineBar
              // eslint-disable-next-line react/no-array-index-key
              key={`timeline-${arenaId}-${pirateIndex}-${i}-${odds}`}
              index={i}
              odds={odds}
              percent={timelineData.percentages[i] ?? 0}
            />
          ))}
        </Box>
      </Td>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId && prevProps.pirateIndex === nextProps.pirateIndex,
);

OddsTimeline.displayName = 'OddsTimeline';

export default OddsTimeline;
