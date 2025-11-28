
import React from 'react';

interface RadarChartData {
  label: string;
  value: number; // 0 to 100
}

interface RadarChartProps {
  data: RadarChartData[];
  size?: number;
  fillColor?: string;
  strokeColor?: string;
}

const RadarChart: React.FC<RadarChartProps> = ({ 
    data, 
    size = 300, 
    fillColor = 'rgba(56, 189, 248, 0.5)', 
    strokeColor = '#38bdf8' 
}) => {
  const width = size;
  const height = size;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = (width / 2) - 40; // Padding for labels
  const levels = 4; // Number of grid levels
  const count = data.length;
  const angleStep = (Math.PI * 2) / count;

  // Helper to polar to cartesian
  const getCoordinates = (value: number, index: number) => {
    // - PI/2 to start at top (12 o'clock)
    const angle = (Math.PI / 2) + (index * angleStep); 
    // Invert Y because SVG Y grows downwards
    const x = centerX + (radius * (value / 100)) * Math.cos(angle);
    const y = centerY - (radius * (value / 100)) * Math.sin(angle);
    return { x, y };
  };
  
  // Calculate polygon points
  const dataPoints = data.map((d, i) => {
      return getCoordinates(d.value, i);
  });
  
  const pointsString = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const getPointColor = (value: number) => {
    // 0 = Red (0deg), 100 = Green (120deg)
    const hue = Math.min(120, Math.max(0, value * 1.2));
    return `hsl(${hue}, 80%, 50%)`;
  };

  // Generate grid webs
  const gridWebs = [];
  for (let i = 1; i <= levels; i++) {
      const levelPoints = [];
      for (let j = 0; j < count; j++) {
          const { x, y } = getCoordinates((100 / levels) * i, j);
          levelPoints.push(`${x},${y}`);
      }
      gridWebs.push(
          <polygon 
            key={`grid-${i}`}
            points={levelPoints.join(' ')}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            className="opacity-50"
          />
      );
  }

  // Generate axis lines
  const axes = [];
  for (let i = 0; i < count; i++) {
      const { x, y } = getCoordinates(100, i);
      axes.push(
          <line 
            key={`axis-${i}`}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="#334155"
            strokeWidth="1"
            className="opacity-50"
          />
      );
  }
  
  // Labels
  const labels = data.map((d, i) => {
      // Push label out a bit more than 100%
      const { x, y } = getCoordinates(115, i);
      
      // Adjust text anchor based on position
      let textAnchor: "middle" | "start" | "end" = 'middle';
      if (Math.abs(x - centerX) < 10) textAnchor = 'middle';
      else if (x > centerX) textAnchor = 'start';
      else textAnchor = 'end';
      
      return (
          <text 
            key={`label-${i}`}
            x={x}
            y={y}
            fill="#cbd5e1"
            fontSize="10"
            fontWeight="bold"
            textAnchor={textAnchor}
            dominantBaseline="middle"
          >
              {d.label}
          </text>
      );
  });

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Background Grid */}
        {gridWebs}
        {axes}
        
        {/* Data Polygon */}
        <polygon 
            points={pointsString}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            className="drop-shadow-[0_0_10px_rgba(56,189,248,0.3)] transition-all duration-1000 ease-out"
        />
        
        {/* Data Points */}
        {dataPoints.map((p, i) => (
             <circle 
               key={`point-${i}`} 
               cx={p.x} 
               cy={p.y} 
               r="4" 
               fill={getPointColor(data[i].value)} 
               stroke="#0f172a"
               strokeWidth="2"
               className="transition-all duration-1000 ease-out"
             />
        ))}

        {/* Labels */}
        {labels}
    </svg>
  );
};

export default RadarChart;
