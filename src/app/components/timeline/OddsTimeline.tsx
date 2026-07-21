import { Box, Skeleton, Table } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { RoundData } from '../../../types';
import { useRoundStore } from '../../stores';
import { getOrdinalSuffix, filterChangesByArenaPirate } from '../../utils/betUtils';

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
 * Build the odds-history segments (opening odds -> each change -> current) for a single
 * pirate, with each segment's proportional width across the round's duration so far.
 * Shared by the table-cell bar (OddsTimeline) and the timeline drawer's pirate view.
 */
export function buildOddsTimelineSegments(
  roundData: RoundData,
  arenaId: number,
  pirateIndex: number,
): OddsTimelineSegment[] {
  const openingOdds = roundData?.openingOdds?.[arenaId]?.[pirateIndex + 1];
  const start = roundData?.start;

  if (!openingOdds || !start) {
    return [];
  }

  const startDate = new Date(start);
  const startTime = startDate.getTime();
  const changes = roundData.changes || [];

  // Build odds history: opening -> changes -> current
  const odds: number[] = [openingOdds];
  const times: number[] = [startTime];

  const pirateChanges = filterChangesByArenaPirate(changes, arenaId, pirateIndex);
  pirateChanges.forEach(change => {
    const lastOdds = odds[odds.length - 1];
    if (change.new !== lastOdds) {
      odds.push(change.new);
      times.push(new Date(change.t).getTime());
    }
  });

  // Determine end time for the timeline
  let endTime: number;
  if (pirateChanges.length > 0) {
    // This pirate has had changes, use timestamp as end
    endTime = new Date(roundData.timestamp as string).getTime();
  } else if (roundData.lastChange) {
    // No changes for this pirate, but round has changes - use lastChange
    endTime = new Date(roundData.lastChange).getTime();
  } else {
    // Brand new round, no changes at all - use start time
    endTime = startTime;
  }

  const percentages = calculatePercentages(times, endTime);

  return odds.map((thisOdds, i) => ({
    odds: thisOdds,
    percent: percentages[i] ?? 0,
    timestamp: times[i] ?? 0,
  }));
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
    size?: 'sm' | 'lg';
  }): React.ReactElement => {
    const { index, odds, percent, timestamp, size = 'sm' } = props;

    const palettes = [
      'nfc-cyan',
      'nfc-green',
      'nfc-blue',
      'nfc-purple',
      'nfc-orange',
      'nfc-red',
      'nfc-yellow',
      'gray',
      'nfc-pink',
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
          fontSize={size === 'lg' ? 'sm' : 'xs'}
          layerStyle="fill.muted"
          colorPalette={palettes[odds % (palettes.length - 1)]}
          fontWeight="semibold"
          textAlign="center"
          minH={size === 'lg' ? '9' : '6'}
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

export interface OddsTimelineSegment {
  odds: number;
  percent: number;
  timestamp: number;
}

interface OddsTimelineBarsProps {
  arenaId: number;
  pirateIndex: number;
  segments: OddsTimelineSegment[];
  onClick?: () => void;
  readOnly?: boolean;
  ariaLabel?: string;
  maxW?: string;
  size?: 'sm' | 'lg';
}

export const OddsTimelineBars = React.memo((props: OddsTimelineBarsProps): React.ReactElement => {
  const {
    arenaId,
    pirateIndex,
    segments,
    onClick,
    readOnly = false,
    ariaLabel = 'Example odds timeline',
    maxW = '300px',
    size = 'sm',
  } = props;

  return (
    <Box
      maxW={maxW}
      onClick={readOnly ? undefined : onClick}
      cursor={readOnly ? 'default' : 'pointer'}
      display="flex"
      px="0"
      overflow="hidden"
      borderRadius="lg"
      border="1px solid"
      borderColor="border"
      role={readOnly ? 'img' : undefined}
      aria-label={readOnly ? ariaLabel : undefined}
      css={readOnly ? { '& *': { cursor: 'default' } } : undefined}
    >
      {segments.map((segment, i) => (
        <TimelineBar
          key={`timeline-${arenaId}-${pirateIndex}-${segment.timestamp}-${segment.odds}`}
          index={i}
          odds={segment.odds}
          percent={segment.percent}
          timestamp={segment.timestamp}
          size={size}
        />
      ))}
    </Box>
  );
});

OddsTimelineBars.displayName = 'OddsTimelineBars';

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

    const segments = useMemo(
      () => buildOddsTimelineSegments(roundData, arenaId, pirateIndex),
      [roundData, arenaId, pirateIndex],
    );

    if (!openingOdds || !start) {
      return (
        <Table.Cell p={0}>
          <Skeleton height="6" width="100%" borderRadius="md" />
        </Table.Cell>
      );
    }

    return (
      <Table.Cell p={0}>
        <OddsTimelineBars
          arenaId={arenaId}
          pirateIndex={pirateIndex}
          segments={segments}
          onClick={onClick}
        />
      </Table.Cell>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId && prevProps.pirateIndex === nextProps.pirateIndex,
);

OddsTimeline.displayName = 'OddsTimeline';

export default OddsTimeline;
