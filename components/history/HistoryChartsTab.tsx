
import React, { useMemo, useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { WorkoutSession, ChartDataPoint } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import ChartBlock from '../common/ChartBlock';
import FullScreenChartModal from '../common/FullScreenChartModal';
import { useExerciseName } from '../../hooks/useExerciseName';

interface HistoryChartsTabProps {
    history: WorkoutSession[];
}

interface FullScreenChartData {
    title: string;
    data: ChartDataPoint[];
    color?: string;
}

const HistoryChartsTab: React.FC<HistoryChartsTabProps> = ({ history }) => {
    const { getExerciseById } = useContext(AppContext);
    const { t } = useI18n();
    const getExerciseName = useExerciseName();
    const [fullScreenChart, setFullScreenChart] = useState<FullScreenChartData | null>(null);

    const chartData = useMemo(() => {
        if (history.length === 0) {
            return { totalVolume: [], topExercises: [] };
        }

        // Sort Ascending (Oldest -> Newest) for chronological charts
        const chronologicalHistory = [...history].sort((a, b) => a.startTime - b.startTime);
        const dateFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

        // 1. Total Volume Over Time
        const totalVolumeData: ChartDataPoint[] = chronologicalHistory.map(session => {
            const totalVolume = session.exercises.reduce((total, ex) => {
                return total + ex.sets.reduce((exTotal, set) => exTotal + (set.isComplete ? (set.weight * set.reps) : 0), 0);
            }, 0);
            return {
                date: session.startTime,
                label: new Date(session.startTime).toLocaleDateString(undefined, dateFormat),
                value: totalVolume,
            };
        });

        // 2. Top Exercises by Frequency
        const exerciseCounts = new Map<string, number>();
        history.forEach(session => {
            // Use Set to count "sessions with exercise" rather than "total sets of exercise"
            const distinctExercises = new Set(session.exercises.map(ex => ex.exerciseId));
            distinctExercises.forEach((exerciseId: string) => {
                exerciseCounts.set(exerciseId, (exerciseCounts.get(exerciseId) || 0) + 1);
            });
        });

        const exercisesWithCounts = Array.from(exerciseCounts.keys()).map(exerciseId => ({
            exerciseId,
            count: exerciseCounts.get(exerciseId) || 0
        }));
        
        // Sort descending by count
        const sortedExercises = exercisesWithCounts.sort((a, b) => b.count - a.count);
        
        // Take top 5 most frequent
        const topIds = sortedExercises.slice(0, 5).map(entry => entry.exerciseId);

        const topExercisesChartData = topIds.map(exerciseId => {
            const exerciseInfo = getExerciseById(exerciseId);
            const data: ChartDataPoint[] = [];

            chronologicalHistory.forEach(session => {
                // Aggregate all instances of this exercise in the session (e.g. if done twice or in superset)
                const exercisesInSession = session.exercises.filter(ex => ex.exerciseId === exerciseId);
                
                if (exercisesInSession.length > 0) {
                    const exerciseVolume = exercisesInSession.reduce((vol, ex) => {
                         return vol + ex.sets.reduce((sum, set) => sum + (set.isComplete ? (set.weight * set.reps) : 0), 0);
                    }, 0);

                    // Only plot if there was volume (skip empty entries if any)
                    if (exerciseVolume > 0) {
                        data.push({
                            date: session.startTime,
                            label: new Date(session.startTime).toLocaleDateString(undefined, dateFormat),
                            value: exerciseVolume
                        });
                    }
                }
            });

            return {
                exerciseInfo,
                data,
            };
        }).filter(item => item.exerciseInfo && item.data.length > 1); // Only show charts with at least 2 points for a line

        return { totalVolume: totalVolumeData, topExercises: topExercisesChartData };
    }, [history, getExerciseById]);

    if (history.length === 0) {
        return (
          <div className="text-center text-text-secondary py-8">
            <p>{t('history_no_data')}</p>
          </div>
        );
    }
    
    const colors = ["#818cf8", "#f87171", "#4ade80", "#fbbf24", "#a78bfa"];

    return (
        <div className="space-y-4">
            <ChartBlock 
                title={t('graphs_total_volume')} 
                data={chartData.totalVolume} 
                color="#38bdf8" 
                filenamePrefix="History"
                onFullScreen={() => setFullScreenChart({ title: t('graphs_total_volume'), data: chartData.totalVolume, color: '#38bdf8' })}
            />

            {chartData.topExercises.map(({ exerciseInfo, data }, index) => {
                if (!exerciseInfo) return null;
                const name = getExerciseName(exerciseInfo);
                const title = `${name} - Volume`;
                const color = colors[index % colors.length];
                return (
                    <ChartBlock 
                        key={exerciseInfo.id}
                        title={title}
                        data={data}
                        color={color}
                        filenamePrefix={name}
                        onFullScreen={() => setFullScreenChart({ title, data, color })}
                    />
                );
            })}

            {chartData.topExercises.length === 0 && chartData.totalVolume.length > 0 && (
                <div className="text-center text-text-secondary py-4">
                    <p>Keep training to unlock specific exercise trends!</p>
                </div>
            )}
            
            {fullScreenChart && (
                <FullScreenChartModal
                    isOpen={!!fullScreenChart}
                    onClose={() => setFullScreenChart(null)}
                    title={fullScreenChart.title}
                    data={fullScreenChart.data}
                    color={fullScreenChart.color}
                />
            )}
        </div>
    );
};

export default HistoryChartsTab;
