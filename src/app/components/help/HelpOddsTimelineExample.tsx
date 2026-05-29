import { Box } from '@chakra-ui/react';
import * as React from 'react';

import { OddsTimelineBars, type OddsTimelineSegment } from '../timeline/OddsTimeline';

/** Static sample for the help glossary (not wired to live round data). */
const EXAMPLE_SEGMENTS: OddsTimelineSegment[] = [
  { odds: 2, percent: 45, timestamp: 0 },
  { odds: 3, percent: 30, timestamp: 1 },
  { odds: 4, percent: 25, timestamp: 2 },
];

export const HelpOddsTimelineExample: React.FC = () => (
  <Box my="2">
    <OddsTimelineBars arenaId={0} pirateIndex={0} segments={EXAMPLE_SEGMENTS} readOnly />
  </Box>
);
