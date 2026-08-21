import { Box, Card } from '@chakra-ui/react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import { downsampleForChart } from '../../backtest/runBacktest';
import {
  SCRAPER_LAG_TOLERANCE_MINUTES,
  classifyDrift,
  type DriftPoint,
  type DriftStatus,
} from '../../devTiming/drift';

import { useColorMode } from '@/components/ui/color-mode';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, annotationPlugin);

const LINE_COLOR = '#3182ce';
const LATE_DRIFT_FILL = 'rgba(221, 107, 32, 0.08)';
const SCRAPER_LAG_FILL = 'rgba(49, 130, 206, 0.10)';

function formatOffset(value: number): string {
  if (value === 0) {
    return 'on time';
  }
  const sign = value > 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(value).toFixed(0)} min`;
}

function statusLabel(status: DriftStatus): string {
  switch (status) {
    case 'early':
      return 'ended early';
    case 'scraperLag':
      return 'within scraper-lag window (not drift)';
    case 'lateDrift':
      return 'drifted late';
  }
}

interface RoundEndDriftChartProps {
  points: DriftPoint[];
}

export function RoundEndDriftChart({ points }: RoundEndDriftChartProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const isDarkLikeMode = colorMode !== 'light';

  const rounds = useMemo(() => points.map(p => p.round), [points]);
  const offsets = useMemo(() => points.map(p => p.offsetMinutes), [points]);

  const chartPoints = useMemo(() => downsampleForChart(offsets, rounds), [offsets, rounds]);

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'End-time offset from 2:15 PM',
          data: chartPoints,
          borderColor: LINE_COLOR,
          backgroundColor: LATE_DRIFT_FILL,
          pointRadius: points.length > 200 ? 0 : 2,
          borderWidth: 1.5,
          fill: false,
        },
      ],
    }),
    [chartPoints, points.length],
  );

  const gridColor = isDarkLikeMode ? '#6272a4' : undefined;
  const textColor = isDarkLikeMode ? '#ffffff' : undefined;

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor,
          },
        },
        annotation: {
          annotations: {
            onTimeLine: {
              type: 'line' as const,
              yMin: 0,
              yMax: 0,
              borderColor: isDarkLikeMode ? '#a0aec0' : '#718096',
              borderWidth: 1,
              borderDash: [4, 4],
            },
            scraperLagBand: {
              type: 'box' as const,
              yMin: 0,
              yMax: SCRAPER_LAG_TOLERANCE_MINUTES,
              backgroundColor: SCRAPER_LAG_FILL,
              borderWidth: 0,
            },
          },
        },
        tooltip: {
          displayColors: false,
          itemSort: (a: TooltipItem<'line'>, b: TooltipItem<'line'>): number =>
            (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
          callbacks: {
            title: (items: TooltipItem<'line'>[]): string => {
              const round = items[0]?.parsed.x;
              return round !== undefined ? `Round ${round}` : '';
            },
            label: (context: TooltipItem<'line'>): string[] => {
              const offset = context.parsed.y ?? 0;
              return [formatOffset(offset), statusLabel(classifyDrift(offset))];
            },
          },
        },
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      animation: {
        duration: 0,
      },
      scales: {
        x: {
          type: 'linear' as const,
          title: {
            display: true,
            text: 'Round',
            color: textColor,
          },
          ticks: {
            color: textColor,
          },
          grid: {
            color: gridColor,
            borderColor: gridColor,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Offset from 2:15 PM (minutes)',
            color: textColor,
          },
          ticks: {
            color: textColor,
            callback: (value: number | string): string => formatOffset(Number(value)),
          },
          grid: {
            color: gridColor,
            borderColor: gridColor,
          },
        },
      },
    }),
    [gridColor, textColor, isDarkLikeMode],
  );

  return (
    <Card.Root boxShadow="md">
      <Card.Body p={2}>
        <Box w="full" h={{ base: '260px', md: '360px' }}>
          {/* @ts-ignore */}
          <Line data={data} options={options} />
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
