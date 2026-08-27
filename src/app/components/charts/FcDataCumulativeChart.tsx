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

import type { FcDataCumulativePoint } from '../../analysis/fcDataStats';

import { useColorMode } from '@/components/ui/color-mode';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const LINE_COLOR = '#38a169';

interface FcDataCumulativeChartProps {
  series: FcDataCumulativePoint[];
}

export function FcDataCumulativeChart({ series }: FcDataCumulativeChartProps): React.JSX.Element {
  const { colorMode } = useColorMode();
  const isDarkLikeMode = colorMode !== 'light';

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: 'Cumulative units won',
          data: series.map(point => ({ x: point.round, y: point.cumulative })),
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
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]): string => {
              const round = items[0]?.parsed.x;
              return round !== undefined ? `Round ${round}` : '';
            },
            label: (context: TooltipItem<'line'>): string =>
              `Cumulative: ${(context.parsed.y ?? 0).toLocaleString()}`,
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
            text: 'Cumulative Units Won',
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
