import { Box, Card } from '@chakra-ui/react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const MATCHUP_A_COLOR = '#3182ce';
export const MATCHUP_B_COLOR = '#dd6b20';
export const MATCHUP_NEITHER_COLOR = '#a0aec0';

interface MatchupSplitDoughnutProps {
  aName: string;
  bName: string;
  aWins: number;
  bWins: number;
  neitherCount: number;
}

export function MatchupSplitDoughnut({
  aName,
  bName,
  aWins,
  bWins,
  neitherCount,
}: MatchupSplitDoughnutProps): React.JSX.Element {
  const total = aWins + bWins + neitherCount;

  const data = useMemo(
    () => ({
      labels: [`${aName} won`, `${bName} won`, 'Neither'],
      datasets: [
        {
          data: [aWins, bWins, neitherCount],
          backgroundColor: [MATCHUP_A_COLOR, MATCHUP_B_COLOR, MATCHUP_NEITHER_COLOR],
          borderColor: 'transparent',
          borderWidth: 0,
        },
      ],
    }),
    [aName, bName, aWins, bWins, neitherCount],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          itemSort: (a: TooltipItem<'doughnut'>, b: TooltipItem<'doughnut'>): number =>
            b.parsed - a.parsed,
          callbacks: {
            label: (context: TooltipItem<'doughnut'>): string => {
              const value = context.parsed;
              const pct = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00';
              return ` ${value} (${pct}%)`;
            },
          },
        },
      },
    }),
    [total],
  );

  return (
    <Card.Root boxShadow="md">
      <Card.Body p={2}>
        <Box w="full" h={{ base: '240px', md: '280px' }}>
          {/* @ts-ignore */}
          <Doughnut data={data} options={options} />
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
