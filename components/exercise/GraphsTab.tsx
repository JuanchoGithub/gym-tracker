
import React, { useMemo, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { ExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { ChartDataPoint, Exercise, PerformedSet } from '../../types';
import FullScreenChartModal from '../common/FullScreenChartModal';
import ChartBlock from '../common/ChartBlock';

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
    // Limit to last 40 sessions to avoid chart pollution
    const recentHistory = history.slice(0, 40);
    const reversedHistory = [...recentHistory].reverse(); // Oldest first
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
            filenamePrefix={exercise.name}
            onFullScreen={() => setFullScreenChart({ title: t('graphs_best_1rm'), data: chartData.bestE1RMData, color: '#818cf8' })}
        />
        <ChartBlock 
            title={t('graphs_max_weight')} 
            data={chartData.maxWeightData} 
            color="#f87171" 
            filenamePrefix={exercise.name}
            onFullScreen={() => setFullScreenChart({ title: t('graphs_max_weight'), data: chartData.maxWeightData, color: '#f87171' })}
        />
        <ChartBlock 
            title={t('graphs_total_volume')} 
            data={chartData.totalVolumeData} 
            color="#38bdf8" 
            filenamePrefix={exercise.name}
            onFullScreen={() => setFullScreenChart({ title: t('graphs_total_volume'), data: chartData.totalVolumeData, color: '#38bdf8' })}
        />
        <ChartBlock 
            title={t('graphs_max_reps')} 
            data={chartData.maxRepsData} 
            color="#facc15" 
            filenamePrefix={exercise.name}
            onFullScreen={() => setFullScreenChart({ title: t('graphs_max_reps'), data: chartData.maxRepsData, color: '#facc15' })}
        />
        <ChartBlock 
            title={t('graphs_pr_progression')} 
            data={chartData.prProgressionData} 
            color="#4ade80" 
            filenamePrefix={exercise.name}
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
