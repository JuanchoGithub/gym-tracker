
import React, { useState, useRef } from 'react';
import { ChartDataPoint } from '../../types';
import Chart from './Chart';
import { Icon } from './Icon';
import { exportToCsv, exportToJson, exportToPng } from '../../services/dataService';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ChartBlockProps {
  title: string;
  data: ChartDataPoint[];
  filenamePrefix: string;
  color?: string;
  onFullScreen: () => void;
}

const ChartBlock: React.FC<ChartBlockProps> = ({ title, data, filenamePrefix, color, onFullScreen }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);

  useClickOutside(exportMenuRef, () => setShowExport(false));

  const handleExport = (format: 'csv' | 'json' | 'png') => {
    setShowExport(false);
    const dataToExport = data.map(d => ({ date: new Date(d.date).toISOString().split('T')[0], value: d.value }));
    const filename = `${filenamePrefix}-${title.replace(/ /g, '-')}`;
    if (format === 'csv') exportToCsv(dataToExport, filename);
    if (format === 'json') exportToJson(dataToExport, filename);
    if (format === 'png' && wrapperRef.current) {
      const svgEl = wrapperRef.current.querySelector('svg');
      if (svgEl) {
        exportToPng(svgEl, filename);
      }
    }
  };

  const handleShare = async () => {
    setShowExport(false);
    if (!navigator.share || !wrapperRef.current) {
        alert('Share API not supported on this browser.');
        return;
    }

    const svgEl = wrapperRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const file = new File([svgBlob], `${filenamePrefix}-${title.replace(/ /g, '-')}.svg`, {type: 'image/svg+xml'});

    try {
        await navigator.share({
            title: `${filenamePrefix} - ${title}`,
            text: `Check out my progress: ${title}`,
            files: [file],
        });
    } catch (error) {
        console.error('Error sharing:', error);
    }
  }

  return (
    <div className="bg-slate-900/50 p-3 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-text-primary">{title}</h3>
            <div className="relative flex items-center space-x-2" ref={exportMenuRef}>
                <button onClick={onFullScreen} className="text-text-secondary hover:text-text-primary" aria-label={`View ${title} in fullscreen`}>
                    <Icon name="expand" className="w-5 h-5" />
                </button>
                <button onClick={() => setShowExport(!showExport)} className="text-text-secondary hover:text-text-primary">
                    <Icon name="export" className="w-5 h-5" />
                </button>
                {showExport && (
                    <div className="absolute right-0 mt-8 top-0 w-40 bg-surface rounded-md shadow-lg z-10 border border-white/10">
                        <button onClick={handleShare} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Share Graph</button>
                        <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Export PNG</button>
                        <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Export CSV</button>
                        <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Export JSON</button>
                    </div>
                )}
            </div>
        </div>
        <div ref={wrapperRef}>
            <Chart data={data} color={color} />
        </div>
    </div>
  );
};

export default ChartBlock;
