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

import type { FcDataRoiPoint } from '../../analysis/fcDataStats';

import { useColorMode } from '@/components/ui/color-mode';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, annotationPlugin);

const LINE_COLOR = '#dd6b20';

interface FcDataRoiChartProps {
  series: FcDataRoiPoint[];
}

export function FcDataRoiChart({ series }: FcDataRoiChartProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const isDarkLikeMode = colorMode !== 'light';

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Running ROI',
          data: series.map(point => ({ x: point.round, y: point.roi })),
          borderColor: LINE_COLOR,
          backgroundColor: LINE_COLOR,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [series],
  );

  const gridColor = isDarkLikeMode ? '#6272a4' : undefined;
  const textColor = isDarkLikeMode ? '#ffffff' : undefined;

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        annotation: {
          annotations: {
            breakeven: {
              type: 'line' as const,
              yMin: 1,
              yMax: 1,
              borderColor: isDarkLikeMode ? '#a0aec0' : '#718096',
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                display: true,
                content: 'Breakeven',
                position: 'start' as const,
                backgroundColor: 'transparent',
                color: isDarkLikeMode ? '#a0aec0' : '#718096',
                font: { size: 10 },
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]): string => {
              const round = items[0]?.parsed.x;
              return round !== undefined ? `Round ${round}` : '';
            },
            label: (context: TooltipItem<'line'>): string =>
              `ROI: ${(context.parsed.y ?? 0).toFixed(2)}x`,
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
            text: 'Running ROI',
            color: textColor,
          },
          ticks: {
            color: textColor,
            callback: (value: number | string): string => `${Number(value).toFixed(1)}x`,
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
