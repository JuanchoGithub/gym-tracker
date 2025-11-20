
import React from 'react';
import { ChartDataPoint } from '../../types';

interface ChartProps {
  data: ChartDataPoint[];
  color?: string;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 350;
const DEFAULT_HEIGHT = 150;

const Chart: React.FC<ChartProps> = ({ data, color = '#0284c7', width, height }) => {
  const chartWidth = width || DEFAULT_WIDTH;
  const chartHeight = height || DEFAULT_HEIGHT;
  
  // Scale fonts slightly for larger charts, but keep them reasonable
  const fontSize = Math.max(10, Math.min(14, chartWidth / 60));

  if (data.length === 0) {
    return (
      <div style={{ height: chartHeight }} className="flex w-full items-center justify-center text-text-secondary">
        Not enough data to display chart.
      </div>
    );
  }

  const padding = { top: 10, right: 15, bottom: 25, left: 35 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const minValue = 0;

  const xScale = (index: number) => {
    if (data.length === 1) {
      return padding.left + innerWidth / 2;
    }
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const yScale = (value: number) => {
    if (maxValue === minValue) {
      return padding.top + innerHeight / 2;
    }
    return padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
  };
  
  const path = data.length > 1 ? data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ') : '';

  const yAxisLabels = [minValue, (minValue + maxValue) / 2, maxValue].map(val => ({
    value: Math.round(val),
    y: yScale(val),
  }));

  let xAxisLabels: { value: string; x: number }[];
  
  if (data.length === 1) {
    xAxisLabels = [{ value: data[0].label, x: xScale(0) }];
  } else {
    // Simple collision avoidance for x-axis labels
    // Assuming each label takes roughly 60px (depends on date format and font size)
    const labelWidthEstimate = 60;
    const maxLabels = Math.floor(innerWidth / labelWidthEstimate);
    
    // Calculate a step size to pick labels
    const step = Math.ceil(data.length / maxLabels);
    
    xAxisLabels = [];
    for (let i = 0; i < data.length; i += step) {
      xAxisLabels.push({ value: data[i].label, x: xScale(i) });
    }
    
    // Ensure the very last data point's label is shown if it's not too close to the previous one
    const lastIndex = data.length - 1;
    const lastLabel = { value: data[lastIndex].label, x: xScale(lastIndex) };
    
    if (xAxisLabels.length > 0) {
        const lastAdded = xAxisLabels[xAxisLabels.length - 1];
        if (lastAdded.x !== lastLabel.x) {
            // Check overlap with the last added label
            if (lastLabel.x - lastAdded.x < labelWidthEstimate * 0.8) {
                // Too close, replace the last one with the actual last label (prioritize end date)
                xAxisLabels.pop();
            }
            xAxisLabels.push(lastLabel);
        }
    } else {
        xAxisLabels.push(lastLabel);
    }
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
      {/* Y Axis Grid Lines & Labels */}
      {yAxisLabels.map(label => (
        <g key={label.value}>
          <line x1={padding.left} y1={label.y} x2={chartWidth - padding.right} y2={label.y} stroke="#334155" strokeWidth="0.5" />
          <text x={padding.left - 5} y={label.y} fill="#94a3b8" fontSize={fontSize} textAnchor="end" alignmentBaseline="middle">
            {label.value}
          </text>
        </g>
      ))}

      {/* X Axis Labels */}
      {xAxisLabels.map((label, index) => (
        <text key={`${label.value}-${index}`} x={label.x} y={chartHeight - 5} fill="#94a3b8" fontSize={fontSize} textAnchor="middle">
          {label.value}
        </text>
      ))}

      {/* Line Path */}
      {path && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}

      {/* Data Points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r={width ? 4 : 3} fill={color} />
      ))}
    </svg>
  );
};

export default Chart;
