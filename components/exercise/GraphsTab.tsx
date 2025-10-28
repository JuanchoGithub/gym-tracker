import React, { useMemo, useRef, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { ExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { ChartDataPoint, Exercise, PerformedSet } from '../../types';
import Chart from '../common/Chart';
import { Icon } from '../common/Icon';
import { exportToCsv, exportToJson, exportToPng } from '../../services/dataService';
import FullScreenChartModal from '../common/FullScreenChartModal';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ChartBlockProps {
  title: string;
  data: ChartDataPoint[];
  exerciseName: string;
  color?: string;
  onFullScreen: () => void;
}

const ChartBlock: React.FC<ChartBlockProps> = ({ title, data, exerciseName, color, onFullScreen }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showExport, setShowExport] = useState(false);

  useClickOutside(exportMenuRef, () => setShowExport(false));

  const handleExport = (format: 'csv' | 'json' | 'png') => {
    setShowExport(false);
    const dataToExport = data.map(d => ({ date: new Date(d.date).toISOString().split('T')[0], value: d.value }));
    const filename = `${exerciseName}-${title.replace(/ /g, '-')}`;
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
    const file = new File([svgBlob], `${exerciseName}-${title.replace(/ /g, '-')}.svg`, {type: 'image/svg+xml'});

    try {
        await navigator.share({
            title: `${exerciseName} - ${title}`,
            text: `Check out my workout progress for ${exerciseName}!`,
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
                    <Icon name="share" className="w-5 h-5" />
                </button>
                {showExport && (
                    <div className="absolute right-0 mt-8 top-0 w-40 bg-surface rounded-md shadow-lg z-10">
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

interface GraphsTabProps {
  exercise: Exercise;
  history: ExerciseHistory;
}

interface FullScreenChartData {
  title: string;
  data: ChartDataPoint[];
  color?: string;
}

const GraphsTab: React.FC<GraphsTabProps> = ({ exercise, history }) => {
  const { t } = useI18n();
  const [fullScreenChart, setFullScreenChart] = useState<FullScreenChartData | null>(null);

  const chartData = useMemo(() => {
    const reversedHistory = [...history].reverse(); // Oldest first
    const dateFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    const totalVolumeData: ChartDataPoint[] = reversedHistory.map(entry => ({
      date: entry.session.startTime,
      label: new Date(entry.session.startTime).toLocaleDateString(undefined, dateFormat),
      value: entry.exerciseData.sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    }));

    const maxRepsData: ChartDataPoint[] = reversedHistory.map(entry => ({
      date: entry.session.startTime,
      label: new Date(entry.session.startTime).toLocaleDateString(undefined, dateFormat),
      value: Math.max(0, ...entry.exerciseData.sets.map(s => s.reps)),
    }));

    const bestE1RMData: ChartDataPoint[] = reversedHistory.map(entry => ({
        date: entry.session.startTime,
        label: new Date(entry.session.startTime).toLocaleDateString(undefined, dateFormat),
        value: Math.max(0, ...entry.exerciseData.sets.map(s => calculate1RM(s.weight, s.reps))),
    }));

    const maxWeightData: ChartDataPoint[] = reversedHistory.map(entry => ({
        date: entry.session.startTime,
        label: new Date(entry.session.startTime).toLocaleDateString(undefined, dateFormat),
        value: Math.max(0, ...entry.exerciseData.sets.map(s => s.weight)),
    }));

    // PR Progression logic
    let runningMaxWeight = 0;
    let runningMaxReps = 0;
    let runningMaxVolume = 0;
    const prProgressionData: ChartDataPoint[] = [];

    reversedHistory.forEach(entry => {
        let prSetThisSession: PerformedSet | null = null;
        let sessionMaxWeight = 0;
        let sessionMaxReps = 0;
        let sessionMaxVolume = 0;

        entry.exerciseData.sets.forEach(set => {
            if (set.type !== 'normal' || !set.isComplete) return;
            const volume = set.weight * set.reps;
            
            if (set.weight > runningMaxWeight || set.reps > runningMaxReps || volume > runningMaxVolume) {
                if (!prSetThisSession || calculate1RM(set.weight, set.reps) > calculate1RM(prSetThisSession.weight, prSetThisSession.reps)) {
                    prSetThisSession = set;
                }
            }
            sessionMaxWeight = Math.max(sessionMaxWeight, set.weight);
            sessionMaxReps = Math.max(sessionMaxReps, set.reps);
            sessionMaxVolume = Math.max(sessionMaxVolume, volume);
        });

        if (prSetThisSession) {
             const newPrE1RM = calculate1RM(prSetThisSession.weight, prSetThisSession.reps);
             prProgressionData.push({
                date: entry.session.startTime,
                label: new Date(entry.session.startTime).toLocaleDateString(undefined, dateFormat),
                value: newPrE1RM,
            });
        }
        
        runningMaxWeight = Math.max(runningMaxWeight, sessionMaxWeight);
        runningMaxReps = Math.max(runningMaxReps, sessionMaxReps);
        runningMaxVolume = Math.max(runningMaxVolume, sessionMaxVolume);
    });

    return { totalVolumeData, maxRepsData, bestE1RMData, maxWeightData, prProgressionData };
  }, [history]);

  return (
    <>
      <div className="space-y-4">
        <ChartBlock 
            title={t('graphs_best_1rm')} 
            data={chartData.bestE1RMData} 
            color="#818cf8" 
            exerciseName={exercise.name} 
            onFullScreen={() => setFullScreenChart({ title: t('graphs_best_1rm'), data: chartData.bestE1RMData, color: '#818cf8' })}
        />
        <ChartBlock 
            title={t('graphs_max_weight')} 
            data={chartData.maxWeightData} 
            color="#f87171" 
            exerciseName={exercise.name} 
            onFullScreen={() => setFullScreenChart({ title: t('graphs_max_weight'), data: chartData.maxWeightData, color: '#f87171' })}
        />
        <ChartBlock 
            title={t('graphs_total_volume')} 
            data={chartData.totalVolumeData} 
            color="#38bdf8" 
            exerciseName={exercise.name}
            onFullScreen={() => setFullScreenChart({ title: t('graphs_total_volume'), data: chartData.totalVolumeData, color: '#38bdf8' })}
        />
        <ChartBlock 
            title={t('graphs_max_reps')} 
            data={chartData.maxRepsData} 
            color="#facc15" 
            exerciseName={exercise.name} 
            onFullScreen={() => setFullScreenChart({ title: t('graphs_max_reps'), data: chartData.maxRepsData, color: '#facc15' })}
        />
        <ChartBlock 
            title={t('graphs_pr_progression')} 
            data={chartData.prProgressionData} 
            color="#4ade80" 
            exerciseName={exercise.name} 
            onFullScreen={() => setFullScreenChart({ title: t('graphs_pr_progression'), data: chartData.prProgressionData, color: '#4ade80' })}
        />
      </div>

      {fullScreenChart && (
        <FullScreenChartModal
            isOpen={!!fullScreenChart}
            onClose={() => setFullScreenChart(null)}
            title={fullScreenChart.title}
            data={fullScreenChart.data}
            color={fullScreenChart.color}
        />
      )}
    </>
  );
};

export default GraphsTab;
