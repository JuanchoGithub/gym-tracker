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
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      unlockBodyScroll();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const chartContainerStyle: React.CSSProperties = isPortrait ? {
      transform: 'rotate(90deg)',
      width: '100vh',
      height: '100vw',
      padding: '2rem 1rem'
  } : {
      width: '95vw',
      height: '90vh',
      padding: '1rem'
  };

  return (
    <div className="fixed inset-0 bg-background z-[100] flex items-center justify-center" role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute top-4 right-4 text-white z-10 bg-black/50 rounded-full p-2 hover:bg-black/80" aria-label="Close fullscreen chart">
        <Icon name="x" />
      </button>
      <div style={chartContainerStyle} className="flex flex-col items-center justify-center">
        <h3 className="text-center text-lg font-bold mb-2 text-text-primary">{title}</h3>
        <div className="flex-grow w-full h-full">
          <Chart data={data} color={color} />
        </div>
      </div>
    </div>
  );
};

export default FullScreenChartModal;
