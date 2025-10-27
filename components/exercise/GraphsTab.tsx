import React, { useMemo, useRef, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { ExerciseHistory } from '../../utils/workoutUtils';
import { ChartDataPoint, Exercise } from '../../types';
import Chart from '../common/Chart';
import { Icon } from '../common/Icon';
import { exportToCsv, exportToJson, exportToPng } from '../../services/dataService';

interface GraphsTabProps {
  exercise: Exercise;
  history: ExerciseHistory;
}

const GraphsTab: React.FC<GraphsTabProps> = ({ exercise, history }) => {
  const { t } = useI18n();
  const [showExport, setShowExport] = useState(false);
  const chartRef = useRef<SVGSVGElement>(null);

  const chartData = useMemo(() => {
    const reversedHistory = [...history].reverse();
    const totalVolumeData: ChartDataPoint[] = reversedHistory.map(entry => ({
      date: entry.session.startTime,
      label: new Date(entry.session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: entry.exerciseData.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    }));

    const maxRepsData: ChartDataPoint[] = reversedHistory.map(entry => ({
      date: entry.session.startTime,
      label: new Date(entry.session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.max(...entry.exerciseData.sets.map(s => s.reps)),
    }));

    return { totalVolumeData, maxRepsData };
  }, [history]);

  const handleExport = (format: 'csv' | 'json' | 'png') => {
    const dataToExport = chartData.totalVolumeData.map(d => ({ date: new Date(d.date).toISOString().split('T')[0], volume: d.value }));
    const filename = `${exercise.name}-volume-over-time`;
    if (format === 'csv') exportToCsv(dataToExport, filename);
    if (format === 'json') exportToJson(dataToExport, filename);
    if (format === 'png' && chartRef.current) exportToPng(chartRef.current, filename);
  };

  const handleShare = async () => {
    if (!navigator.share || !chartRef.current) {
        alert('Share API not supported on this browser.');
        return;
    }

    const svgString = new XMLSerializer().serializeToString(chartRef.current);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const file = new File([svgBlob], `${exercise.name}-progress.svg`, {type: 'image/svg+xml'});

    try {
        await navigator.share({
            title: `${exercise.name} Progress`,
            text: `Check out my workout progress for ${exercise.name}!`,
            files: [file],
        });
    } catch (error) {
        console.error('Error sharing:', error);
    }
  }


  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 p-3 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-text-primary">{t('graphs_total_volume')}</h3>
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="text-text-secondary hover:text-text-primary">
              <Icon name="share" className="w-5 h-5" />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-2 w-40 bg-surface rounded-md shadow-lg z-10">
                <button onClick={handleShare} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Share Graph</button>
                <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Export PNG</button>
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Export CSV</button>
                <button onClick={() => handleExport('json')} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-700">Export JSON</button>
              </div>
            )}
          </div>
        </div>
        <div ref={chartRef as any}>
          <Chart data={chartData.totalVolumeData} />
        </div>
      </div>
      <div className="bg-slate-900/50 p-3 rounded-lg">
        <h3 className="font-bold text-text-primary mb-2">{t('graphs_max_reps')}</h3>
        <Chart data={chartData.maxRepsData} color="#facc15" />
      </div>
    </div>
  );
};

export default GraphsTab;