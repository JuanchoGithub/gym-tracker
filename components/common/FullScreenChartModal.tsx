
import React, { useState, useEffect } from 'react';
import { ChartDataPoint } from '../../types';
import { Icon } from './Icon';
import Chart from './Chart';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/timeUtils';

interface FullScreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: ChartDataPoint[];
  color?: string;
}

const FullScreenChartModal: React.FC<FullScreenChartModalProps> = ({ isOpen, onClose, title, data, color }) => {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const isPortrait = dimensions.height > dimensions.width;

  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();
    
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial set
    handleResize();

    return () => {
      unlockBodyScroll();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate optimized dimensions for the SVG chart
  let chartWidth, chartHeight;
  
  if (isPortrait) {
      // In portrait mode, we rotate the container 90deg.
      // The container's 'width' becomes the screen's height (100vh)
      // The container's 'height' becomes the screen's width (100vw)
      // We assume some padding (e.g. 40px horizontal total, 80px vertical total for header/margins)
      chartWidth = dimensions.height - 40; 
      chartHeight = dimensions.width - 80;
  } else {
      // Landscape mode - standard fill
      chartWidth = dimensions.width - 40;
      chartHeight = dimensions.height - 80;
  }

  const chartContainerStyle: React.CSSProperties = isPortrait ? {
      transform: 'rotate(90deg)',
      width: '100vh',
      height: '100vw',
      padding: '1rem',
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: 'center center',
      // Centering logic when rotated
      marginLeft: (dimensions.width - dimensions.height) / 2,
      marginTop: (dimensions.height - dimensions.width) / 2,
  } : {
      width: '100vw',
      height: '100vh',
      padding: '1rem'
  };

  return (
    <div className="fixed inset-0 bg-background z-[100] overflow-hidden" role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute top-4 right-4 text-white z-[110] bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors" aria-label="Close fullscreen chart">
        <Icon name="x" />
      </button>
      <div style={chartContainerStyle} className="flex flex-col items-center justify-center bg-background">
        <h3 className="text-center text-xl font-bold mb-4 text-text-primary flex-shrink-0">{title}</h3>
        <div className="flex-grow w-full flex items-center justify-center">
          <Chart data={data} color={color} width={Math.floor(chartWidth)} height={Math.floor(chartHeight)} />
        </div>
      </div>
    </div>
  );
};

export default FullScreenChartModal;
