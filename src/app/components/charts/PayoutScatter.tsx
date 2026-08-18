import { Chart as ChartJS, ChartData, ChartOptions } from 'chart.js';
import React, { useRef, useLayoutEffect } from 'react';

interface PayoutScatterProps {
  data: ChartData<'scatter'>;
  options: ChartOptions<'scatter'>;
  height?: number;
}

const PayoutScatter: React.FC<PayoutScatterProps> = React.memo(
  ({ data, options, height = 180 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartJS<'scatter'> | null>(null);
    const initialDataRef = useRef(data);
    const initialOptionsRef = useRef(options);

    // Create chart on mount, destroy on unmount
    useLayoutEffect(() => {
      if (!canvasRef.current) {
        return undefined;
      }

      chartRef.current = new ChartJS(canvasRef.current, {
        type: 'scatter',
        data: initialDataRef.current,
        options: initialOptionsRef.current,
      });

      return (): void => {
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }, []);

    // Update chart data and options before paint
    useLayoutEffect(() => {
      const chart = chartRef.current;
      if (!chart) {
        return;
      }

      // Update options
      if (options) {
        Object.assign(chart.options, options);
      }

      // Update datasets - mutate in place to avoid flicker
      if (data.datasets) {
        const currentData = chart.config.data;
        if (data.labels) {
          currentData.labels = data.labels;
        }

        // Find the existing dataset and update it in place
        const nextDataset = data.datasets[0];
        if (currentData.datasets[0] && nextDataset) {
          Object.assign(currentData.datasets[0], nextDataset);
        } else {
          currentData.datasets = data.datasets.map(ds => ({ ...ds }));
        }
      }

      chart.update('none');
    }, [data, options]);

    return <canvas ref={canvasRef} role="img" height={height} style={{ width: '100%' }} />;
  },
);

PayoutScatter.displayName = 'PayoutScatter';

export default PayoutScatter;
