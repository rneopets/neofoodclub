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
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import { downsampleForChart } from '../../backtest/runBacktest';
import { amountAbbreviation } from '../../util';

import { useColorMode } from '@/components/ui/color-mode';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const LEGACY_COLOR = '#3182ce';
const LOGIT_COLOR = '#dd6b20';

interface BacktestComparisonChartProps {
  rounds: number[];
  legacyCumulative: number[];
  logitCumulative: number[];
}

export function BacktestComparisonChart({
  rounds,
  legacyCumulative,
  logitCumulative,
}: BacktestComparisonChartProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const isDarkLikeMode = colorMode !== 'light';

  const legacyPoints = useMemo(
    () => downsampleForChart(legacyCumulative, rounds),
    [legacyCumulative, rounds],
  );
  const logitPoints = useMemo(
    () => downsampleForChart(logitCumulative, rounds),
    [logitCumulative, rounds],
  );

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Legacy model',
          data: legacyPoints,
          borderColor: LEGACY_COLOR,
          backgroundColor: LEGACY_COLOR,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Logit model',
          data: logitPoints,
          borderColor: LOGIT_COLOR,
          backgroundColor: LOGIT_COLOR,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [legacyPoints, logitPoints],
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
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]): string => {
              const round = items[0]?.parsed.x;
              return round !== undefined ? `Round ${round}` : '';
            },
            label: (context: TooltipItem<'line'>): string =>
              `${context.dataset.label}: ${(context.parsed.y ?? 0).toLocaleString()}`,
          },
        },
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
            text: 'Cumulative Net Profit',
            color: textColor,
          },
          ticks: {
            color: textColor,
            callback: (value: number | string): string => amountAbbreviation(Number(value)),
          },
          grid: {
            color: gridColor,
            borderColor: gridColor,
          },
        },
      },
    }),
    [gridColor, textColor],
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
