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

import type { FcDataMonthStats } from '../../analysis/fcDataStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const BAR_COLOR = '#3182ce';

interface FcDataMonthlyBarChartProps {
  months: FcDataMonthStats[];
}

export function FcDataMonthlyBarChart({ months }: FcDataMonthlyBarChartProps): React.JSX.Element {
  const data = useMemo(
    () => ({
      labels: months.map(month => month.label),
      datasets: [
        {
          label: 'Units won',
          data: months.map(month => month.totalUnitsWon),
          backgroundColor: BAR_COLOR,
        },
      ],
    }),
    [months],
  );

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
            title: (items: TooltipItem<'bar'>[]): string => items[0]?.label ?? '',
            label: (context: TooltipItem<'bar'>): string =>
              `Units won: ${(context.parsed.y ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
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
