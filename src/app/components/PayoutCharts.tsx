import {
  HStack,
  Card,
  Table,
  Tbody,
  Th,
  Thead,
  Tr,
  Skeleton,
  useColorMode,
  Box,
} from '@chakra-ui/react';
import { Chart, TooltipItem } from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useCallback, useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';

import { PayoutData } from '../../types';
import {
  useRoundDataStore,
  useCalculationsStore,
  useBetBinaries,
  useWinningBetBinary,
  useTotalBetAmounts,
} from '../stores';
import { amountAbbreviation, displayAsPercent, useTableColors } from '../util';

import Td from './Td';
import TextTooltip from './TextTooltip';

Chart.register(annotationPlugin);

interface ChartPoint {
  x: number;
  y: number;
}

interface ChartDataset {
  data: ChartPoint[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
}

interface ChartData {
  datasets: ChartDataset[];
}

interface ScaleOptions {
  ticks?: {
    callback?: (value: number) => string | number;
    color?: string;
  };
  grid?: {
    borderColor?: string;
    color?: string;
  };
  min?: number;
  max?: number;
}

interface ChartOptions {
  plugins: {
    legend: {
      display: boolean;
    };
    annotation: {
      annotations: {
        doubleProfit: {
          type: string;
          xMin: number;
          xMax: number;
          borderColor: string;
          borderWidth: number;
        };
        breakEven: {
          type: string;
          xMin: number;
          xMax: number;
          borderColor: string;
          borderWidth: number;
        };
      };
    };
    tooltip: {
      displayColors: boolean;
      callbacks: {
        label: (context: TooltipItem<'scatter'>) => string[];
      };
    };
  };
  elements: {
    point: {
      radius: number;
    };
  };
  interaction: {
    mode: 'index' | 'dataset' | 'point' | 'nearest' | 'x' | 'y';
    intersect: boolean;
  };
  animation: {
    duration: number;
  };
  scales: {
    x: ScaleOptions;
    y: ScaleOptions;
  };
}

// this element contains the odds/winnings tables + charts

const PayoutCharts: React.FC = React.memo(() => {
  const { green, red } = useTableColors();
  const hasRoundData = useRoundDataStore(state => state.roundState.roundData !== null);

  const betBinaries = useBetBinaries();
  const winningBetBinary = useWinningBetBinary();

  const calculationsData = useCalculationsStore(state => state.calculations);

  const totalBetAmount = useTotalBetAmounts();
  const { colorMode } = useColorMode();

  const makeChart = useCallback(
    (title: string, data: PayoutData[] | undefined): React.ReactElement | null => {
      if (!data) {
        return null;
      }

      const points: ChartPoint[] = [];
      let winningPointIndex = -1;

      // Find the winning point
      if (winningBetBinary > 0) {
        winningPointIndex = data.findIndex(
          dataObj =>
            (title === 'Odds' && calculationsData.totalWinningOdds === dataObj.value) ||
            (title === 'Winnings' && calculationsData.totalWinningPayoff === dataObj.value),
        );
      }

      for (const dataObj of data) {
        points.push({
          x: dataObj.value,
          y: dataObj.probability,
        });
      }

      // Create colors array for the points
      const pointColors = Array(points.length).fill(
        colorMode === 'dark' ? '#ff79c6' : 'rgb(255, 85, 85)',
      );

      // Set winning point color if it exists
      if (winningPointIndex >= 0) {
        pointColors[winningPointIndex] = 'rgb(80, 250, 123)';
      }

      const chartData: ChartData = {
        datasets: [
          {
            data: points,
            borderColor: colorMode === 'dark' ? '#ff79c6' : 'rgb(255, 85, 85)',
            backgroundColor: colorMode === 'dark' ? '#ff79c6' : 'rgb(255, 85, 85)',
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
          },
        ],
      };

      // this will be our "double units/profit" line
      let breakEven = 0;
      let doubleProfit = 0;
      let type = 'units';

      if (title === 'Odds') {
        const validBets = Array.from(betBinaries.values().filter(x => x > 0));

        breakEven = validBets.length;
        doubleProfit = 2 * breakEven;
      } else if (title === 'Winnings') {
        breakEven = totalBetAmount;
        doubleProfit = totalBetAmount * 2;
        type = 'NP';
      }

      const options: ChartOptions = {
        plugins: {
          legend: {
            display: false,
          },
          annotation: {
            annotations: {
              doubleProfit: {
                type: 'line',
                xMin: doubleProfit,
                xMax: doubleProfit,
                borderColor: 'rgb(80, 250, 123)',
                borderWidth: 2,
              },
              breakEven: {
                type: 'line',
                xMin: breakEven,
                xMax: breakEven,
                borderColor: '#000',
                borderWidth: 2,
              },
            },
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function (context: TooltipItem<'scatter'>): string[] {
                return [
                  `${context.parsed.x.toLocaleString()} ${type}`,
                  `${displayAsPercent(context.parsed.y, 3)}`,
                ];
              },
            },
          },
        },
        elements: {
          point: {
            radius: 4,
          },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        animation: {
          duration: 0,
        },
        scales: {
          x: {
            ticks: {
              callback: value => amountAbbreviation(value),
            },
          },
          y: {
            min: 0.0,
            max: 1.0 + Number.EPSILON, // epsilon because without it, anything with a value of 1.0 is cut off
          },
        },
      };

      // add custom dark mode changes to options
      if (colorMode === 'dark') {
        // Update grid colors but no need to update point colors as they're already set
        const gridLineColor = '#6272a4';
        const textColor = '#ffffff';

        if (!options.scales.x.grid) {
          options.scales.x.grid = {};
        }
        options.scales.x.grid.borderColor = gridLineColor;
        options.scales.x.grid.color = gridLineColor;

        if (!options.scales.x.ticks) {
          options.scales.x.ticks = {};
        }
        options.scales.x.ticks.color = textColor;

        if (!options.scales.y.grid) {
          options.scales.y.grid = {};
        }
        options.scales.y.grid.borderColor = gridLineColor;
        options.scales.y.grid.color = gridLineColor;

        if (!options.scales.y.ticks) {
          options.scales.y.ticks = {};
        }
        options.scales.y.ticks.color = textColor;
      }

      return (
        <Tr>
          <Td colSpan={4} pt={2}>
            {/* @ts-ignore */}
            <Scatter data={chartData} options={options} />
          </Td>
        </Tr>
      );
    },
    [betBinaries, totalBetAmount, colorMode, winningBetBinary, calculationsData],
  );

  const makeTable = useCallback(
    (title: string, data: PayoutData[] | undefined): React.ReactElement | null => {
      if (!data) {
        data = [];
      }

      const { totalWinningOdds, totalWinningPayoff } = calculationsData;

      const tableRows = data.map(dataObj => {
        let bgColor: string = 'transparent';

        if (
          winningBetBinary > 0 &&
          ((title === 'Odds' && totalWinningOdds === dataObj.value) ||
            (title === 'Winnings' && totalWinningPayoff === dataObj.value))
        ) {
          if (dataObj.value === 0) {
            bgColor = red;
          } else {
            bgColor = green;
          }
        }

        return (
          <Tr key={dataObj.value} backgroundColor={bgColor}>
            <Td isNumeric>{dataObj.value.toLocaleString()}</Td>
            <Td isNumeric>
              <TextTooltip
                text={displayAsPercent(dataObj.probability, 3)}
                label={displayAsPercent(dataObj.probability)}
              />
            </Td>
            <Td isNumeric>
              <TextTooltip
                text={displayAsPercent(dataObj.cumulative || 0, 3)}
                label={displayAsPercent(dataObj.cumulative || 0)}
              />
            </Td>
            <Td isNumeric>
              <TextTooltip
                text={displayAsPercent(dataObj.tail || 0, 3)}
                label={displayAsPercent(dataObj.tail || 0)}
              />
            </Td>
          </Tr>
        );
      });

      return (
        <Box>
          <Card p={1} boxShadow="2xl">
            <Skeleton isLoaded={hasRoundData && calculationsData.calculated}>
              <Table size="sm" width="auto">
                <Thead>
                  <Tr>
                    <Th>{title}</Th>
                    <Th>Probability</Th>
                    <Th>Cumulative</Th>
                    <Th>Tail</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {tableRows}
                  {makeChart(title, data)}
                </Tbody>
              </Table>
            </Skeleton>
          </Card>
        </Box>
      );
    },
    [calculationsData, winningBetBinary, red, green, hasRoundData, makeChart],
  );

  const oddsTable = useMemo(
    () => makeTable('Odds', calculationsData.payoutTables.odds),
    [makeTable, calculationsData.payoutTables.odds],
  );
  const winningsTable = useMemo(
    () => makeTable('Winnings', calculationsData.payoutTables.winnings),
    [makeTable, calculationsData.payoutTables.winnings],
  );

  return (
    <HStack px={4} pb={4}>
      {oddsTable}
      {winningsTable}
    </HStack>
  );
});

PayoutCharts.displayName = 'PayoutCharts';

export default PayoutCharts;
