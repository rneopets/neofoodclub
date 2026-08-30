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

import { formatBacktestAmount } from '../../backtest/runBacktest';
import type { AmountSweepPoint, ModelBacktestResult } from '../../backtest/types';

import { useColorMode } from '@/components/ui/color-mode';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const LEGACY_COLOR = '#3182ce';
const LOGIT_COLOR = '#dd6b20';

interface BacktestAmountSweepChartProps {
  points: AmountSweepPoint[];
  /** When false, renders a single "Result" series (legacy and logit are identical) instead of both models. Defaults to true. */
  showBothModels?: boolean;
}

const MODEL_FOR_LABEL: Record<string, (point: AmountSweepPoint) => ModelBacktestResult> = {
  'Legacy model': point => point.legacy,
  'Logit model': point => point.logit,
  Result: point => point.legacy,
};

function modelForDataset(point: AmountSweepPoint, datasetLabel: string): ModelBacktestResult {
  const getModel = MODEL_FOR_LABEL[datasetLabel];
  return getModel ? getModel(point) : point.legacy;
}

export function BacktestAmountSweepChart({
  points,
  showBothModels = true,
}: BacktestAmountSweepChartProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const isDarkLikeMode = colorMode !== 'light';

  const data = useMemo(
    () => ({
      datasets: showBothModels
        ? [
            {
              label: 'Legacy model',
              data: points.map(p => ({ x: p.amount, y: p.legacy.roi * 100 })),
              borderColor: LEGACY_COLOR,
              backgroundColor: LEGACY_COLOR,
              pointRadius: 3,
              borderWidth: 2,
            },
            {
              label: 'Logit model',
              data: points.map(p => ({ x: p.amount, y: p.logit.roi * 100 })),
              borderColor: LOGIT_COLOR,
              backgroundColor: LOGIT_COLOR,
              pointRadius: 3,
              borderWidth: 2,
            },
          ]
        : [
            {
              label: 'Result',
              data: points.map(p => ({ x: p.amount, y: p.legacy.roi * 100 })),
              borderColor: LEGACY_COLOR,
              backgroundColor: LEGACY_COLOR,
              pointRadius: 3,
              borderWidth: 2,
            },
          ],
    }),
    [showBothModels, points],
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
          itemSort: (a: TooltipItem<'line'>, b: TooltipItem<'line'>): number => {
            const pointA = points[a.dataIndex];
            const pointB = points[b.dataIndex];
            if (!pointA || !pointB) {
              return 0;
            }
            const modelA = modelForDataset(pointA, a.dataset.label ?? '');
            const modelB = modelForDataset(pointB, b.dataset.label ?? '');
            return modelB.netProfit - modelA.netProfit;
          },
          callbacks: {
            title: (items: TooltipItem<'line'>[]): string => {
              const amount = items[0]?.parsed.x;
              return amount !== undefined && amount !== null
                ? `Bet amount: ${amount.toLocaleString()}`
                : '';
            },
            label: (context: TooltipItem<'line'>): string[] => {
              const point = points[context.dataIndex];
              if (!point) {
                return [];
              }
              const model = modelForDataset(point, context.dataset.label ?? '');
              return [
                `${context.dataset.label}: ${(context.parsed.y ?? 0).toFixed(2)}% ROI`,
                `Net profit: ${model.netProfit.toLocaleString()}`,
                `Total spent: ${model.totalSpent.toLocaleString()}`,
              ];
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
            text: 'Bet amount',
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
        y: {
          title: {
            display: true,
            text: 'ROI (%)',
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
      },
    }),
    [gridColor, textColor, points],
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
