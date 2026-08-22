import { Box, Card } from '@chakra-ui/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { ARENA_NAMES } from '../../constants';
import type { ArenaMatchupBreakdown } from '../../matchup/pirateMatchups';

import { MATCHUP_A_COLOR, MATCHUP_B_COLOR, MATCHUP_NEITHER_COLOR } from './MatchupSplitDoughnut';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface MatchupArenaBarChartProps {
  aName: string;
  bName: string;
  breakdown: ArenaMatchupBreakdown[];
}

export function MatchupArenaBarChart({
  aName,
  bName,
  breakdown,
}: MatchupArenaBarChartProps): React.JSX.Element {
  const data = useMemo(
    () => ({
      labels: ARENA_NAMES.map(name => name),
      datasets: [
        {
          label: `${aName} won`,
          data: breakdown.map(row => row.aWins),
          backgroundColor: MATCHUP_A_COLOR,
        },
        {
          label: `${bName} won`,
          data: breakdown.map(row => row.bWins),
          backgroundColor: MATCHUP_B_COLOR,
        },
        {
          label: 'Neither',
          data: breakdown.map(row => row.neitherCount),
          backgroundColor: MATCHUP_NEITHER_COLOR,
        },
      ],
    }),
    [aName, bName, breakdown],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          itemSort: (a: TooltipItem<'bar'>, b: TooltipItem<'bar'>): number =>
            (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
          callbacks: {
            title: (items: TooltipItem<'bar'>[]): string => {
              const label = items[0]?.label;
              return label ? `${label} arena` : '';
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    }),
    [],
  );

  return (
    <Card.Root boxShadow="md">
      <Card.Body p={2}>
        <Box w="full" h={{ base: '240px', md: '280px' }}>
          {/* @ts-ignore */}
          <Bar data={data} options={options} />
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
