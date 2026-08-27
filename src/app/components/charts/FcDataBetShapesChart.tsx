import { Box, Card } from '@chakra-ui/react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import React, { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';

import type { FcDataBetShapeCounts } from '../../analysis/fcDataStats';

ChartJS.register(ArcElement, Tooltip, Legend);

const GAMBIT_COLOR = '#3182ce';
const BUSTPROOF_COLOR = '#38a169';
const CRAZY_COLOR = '#dd6b20';
const TENBET_COLOR = '#805ad5';
const OTHER_COLOR = '#a0aec0';

interface FcDataBetShapesChartProps {
  shapes: FcDataBetShapeCounts;
}

export function FcDataBetShapesChart({ shapes }: FcDataBetShapesChartProps): React.JSX.Element {
  const data = useMemo(
    () => ({
      labels: ['Gambit', 'Bustproof', 'Crazy', 'Tenbet', 'Other'],
      datasets: [
        {
          data: [
            shapes.gambitShaped,
            shapes.bustproofShaped,
            shapes.crazyShaped,
            shapes.tenbetShaped,
            shapes.other,
          ],
          backgroundColor: [GAMBIT_COLOR, BUSTPROOF_COLOR, CRAZY_COLOR, TENBET_COLOR, OTHER_COLOR],
          borderColor: 'transparent',
          borderWidth: 0,
        },
      ],
    }),
    [shapes],
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
          itemSort: (a: TooltipItem<'pie'>, b: TooltipItem<'pie'>): number => b.parsed - a.parsed,
          callbacks: {
            label: (context: TooltipItem<'pie'>): string => {
              const value = context.parsed;
              const pct = shapes.total > 0 ? ((value / shapes.total) * 100).toFixed(1) : '0.0';
              return ` ${context.label}: ${value} (${pct}%)`;
            },
          },
        },
      },
    }),
    [shapes.total],
  );

  return (
    <Card.Root boxShadow="md">
      <Card.Body p={2}>
        <Box w="full" h={{ base: '240px', md: '280px' }}>
          {/* @ts-ignore */}
          <Pie data={data} options={options} />
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
