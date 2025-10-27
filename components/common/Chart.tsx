
import React from 'react';
import { ChartDataPoint } from '../../types';

interface ChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  color?: string;
}

const Chart: React.FC<ChartProps> = ({ data, width = 300, height = 150, color = '#0284c7' }) => {
  if (data.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-text-secondary">
        Not enough data to display chart.
      </div>
    );
  }

  const padding = { top: 10, right: 10, bottom: 20, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = 0; // Assuming value starts from 0

  const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ');

  const yAxisLabels = [minValue, maxValue / 2, maxValue].map(val => ({
    value: Math.round(val),
    y: yScale(val),
  }));

  const xAxisLabels = [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((d, i, arr) => ({
      value: d.label,
      x: xScale(i === 1 ? Math.floor(data.length/2) : (i === 0 ? 0 : data.length -1)),
  }));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Y Axis Grid Lines & Labels */}
      {yAxisLabels.map(label => (
        <g key={label.value}>
          <line x1={padding.left} y1={label.y} x2={width - padding.right} y2={label.y} stroke="#334155" strokeWidth="0.5" />
          <text x={padding.left - 5} y={label.y} fill="#94a3b8" fontSize="10" textAnchor="end" alignmentBaseline="middle">
            {label.value}
          </text>
        </g>
      ))}

      {/* X Axis Labels */}
      {xAxisLabels.map(label => (
        <text key={label.value} x={label.x} y={height - 5} fill="#94a3b8" fontSize="10" textAnchor="middle">
          {label.value}
        </text>
      ))}

      {/* Line Path */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" />

      {/* Data Points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r="3" fill={color} />
      ))}
    </svg>
  );
};

export default Chart;
