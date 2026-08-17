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

import { downsampleForChart, formatBacktestAmount } from '../../backtest/runBacktest';

import { useColorMode } from '@/components/ui/color-mode';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const LEGACY_COLOR = '#3182ce';
const LOGIT_COLOR = '#dd6b20';
const GENERAL_ER_DASH = [6, 4];

interface BacktestComparisonChartProps {
  rounds: number[];
  legacyMaxTerCumulative: number[];
  legacyGeneralErCumulative: number[];
  logitMaxTerCumulative: number[];
  logitGeneralErCumulative: number[];
}

export function BacktestComparisonChart({
  rounds,
  legacyMaxTerCumulative,
  legacyGeneralErCumulative,
  logitMaxTerCumulative,
  logitGeneralErCumulative,
}: BacktestComparisonChartProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const isDarkLikeMode = colorMode !== 'light';

  const legacyMaxTerPoints = useMemo(
    () => downsampleForChart(legacyMaxTerCumulative, rounds),
    [legacyMaxTerCumulative, rounds],
  );
  const legacyGeneralErPoints = useMemo(
    () => downsampleForChart(legacyGeneralErCumulative, rounds),
    [legacyGeneralErCumulative, rounds],
  );
  const logitMaxTerPoints = useMemo(
    () => downsampleForChart(logitMaxTerCumulative, rounds),
    [logitMaxTerCumulative, rounds],
  );
  const logitGeneralErPoints = useMemo(
    () => downsampleForChart(logitGeneralErCumulative, rounds),
    [logitGeneralErCumulative, rounds],
  );

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Legacy (Max-TER)',
          data: legacyMaxTerPoints,
          borderColor: LEGACY_COLOR,
          backgroundColor: LEGACY_COLOR,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Legacy (General ER)',
          data: legacyGeneralErPoints,
          borderColor: LEGACY_COLOR,
          backgroundColor: LEGACY_COLOR,
          pointRadius: 0,
          borderWidth: 2,
          borderDash: GENERAL_ER_DASH,
        },
        {
          label: 'Logit (Max-TER)',
          data: logitMaxTerPoints,
          borderColor: LOGIT_COLOR,
          backgroundColor: LOGIT_COLOR,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Logit (General ER)',
          data: logitGeneralErPoints,
          borderColor: LOGIT_COLOR,
          backgroundColor: LOGIT_COLOR,
          pointRadius: 0,
          borderWidth: 2,
          borderDash: GENERAL_ER_DASH,
        },
      ],
    }),
    [legacyMaxTerPoints, legacyGeneralErPoints, logitMaxTerPoints, logitGeneralErPoints],
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
          itemSort: (a: TooltipItem<'line'>, b: TooltipItem<'line'>): number =>
            (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
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
            text: 'Cumulative Net Profit',
            color: textColor,
          },
          ticks: {
            color: textColor,
            callback: (value: number | string): string => formatBacktestAmount(Number(value)),
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
