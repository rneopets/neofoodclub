import { Box, Card } from '@chakra-ui/react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import { downsampleForChart } from '../../backtest/runBacktest';
import { cumulativeNetDiff, type MatchupEncounter } from '../../matchup/pirateMatchups';

import { MATCHUP_A_COLOR } from './MatchupSplitDoughnut';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, annotationPlugin);

interface MatchupTrendChartProps {
  aName: string;
  bName: string;
  encounters: MatchupEncounter[];
}

/**
 * Plots the running net win differential (A wins minus B wins, 'neither' rounds
 * ignored) across the pair's shared-arena history. A rising line means A is
 * pulling ahead; a falling line means B. The dashed zero line marks parity.
 */
export function MatchupTrendChart({
  aName,
  bName,
  encounters,
}: MatchupTrendChartProps): React.JSX.Element {
  const rounds = useMemo(() => encounters.map(e => e.round), [encounters]);

  const diffSeries = useMemo(() => cumulativeNetDiff(encounters), [encounters]);

  const chartPoints = useMemo(() => downsampleForChart(diffSeries, rounds), [diffSeries, rounds]);

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: `${aName} \u2212 ${bName}`,
          data: chartPoints,
          borderColor: MATCHUP_A_COLOR,
          backgroundColor: 'rgba(49, 130, 206, 0.10)',
          pointRadius: encounters.length > 200 ? 0 : 2,
          borderWidth: 1.5,
          fill: 'origin',
        },
      ],
    }),
    [aName, bName, chartPoints, encounters.length],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: {
          annotations: {
            parityLine: {
              type: 'line' as const,
              yMin: 0,
              yMax: 0,
              borderColor: '#a0aec0',
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                display: true,
                content: 'parity',
                position: 'end' as const,
              },
            },
          },
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (items: TooltipItem<'line'>[]): string => {
              const round = items[0]?.parsed.x;
              return round !== undefined ? `Round ${round}` : '';
            },
            label: (context: TooltipItem<'line'>): string[] => {
              const diff = context.parsed.y ?? 0;
              const leader = diff === 0 ? 'tied' : diff > 0 ? aName : bName;
              return [`${diff >= 0 ? '+' : ''}${diff} (${leader})`];
            },
          },
        },
      },
      interaction: { mode: 'index' as const, intersect: false },
      animation: { duration: 0 },
      scales: {
        x: {
          type: 'linear' as const,
          title: { display: true, text: 'Round' },
        },
        y: {
          title: { display: true, text: `${aName} wins \u2212 ${bName} wins` },
          ticks: { precision: 0 },
        },
      },
    }),
    [aName, bName],
  );

  return (
    <Card.Root boxShadow="md">
      <Card.Body p={2}>
        <Box w="full" h={{ base: '240px', md: '320px' }}>
          {/* @ts-ignore */}
          <Line data={data} options={options} />
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
