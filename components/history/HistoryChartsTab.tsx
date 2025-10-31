import React, { useMemo, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { WorkoutSession, ChartDataPoint } from '../../types';
import Chart from '../common/Chart';
import { useI18n } from '../../hooks/useI18n';

interface HistoryChartsTabProps {
    history: WorkoutSession[];
}

const ChartContainer: React.FC<{ title: string; data: ChartDataPoint[]; color?: string; }> = ({ title, data, color }) => (
    <div className="bg-surface p-3 rounded-lg shadow">
        <h3 className="font-bold text-text-primary mb-2">{title}</h3>
        <Chart data={data} color={color} />
    </div>
);


const HistoryChartsTab: React.FC<HistoryChartsTabProps> = ({ history }) => {
    const { getExerciseById } = useContext(AppContext);
    const { t } = useI18n();

    const chartData = useMemo(() => {
        if (history.length === 0) {
            return { totalVolume: [], topExercises: [] };
        }

        const reversedHistory = [...history].reverse(); // Oldest first
        const dateFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

        // 1. Total Volume Over Time
        const totalVolumeData: ChartDataPoint[] = reversedHistory.map(session => {
            const totalVolume = session.exercises.reduce((total, ex) => {
                return total + ex.sets.reduce((exTotal, set) => exTotal + (set.weight * set.reps), 0);
            }, 0);
            return {
                date: session.startTime,
                label: new Date(session.startTime).toLocaleDateString(undefined, dateFormat),
                value: totalVolume,
            };
        });

        // 2. Top 3 Exercises
        const exerciseCounts = new Map<string, number>();
        history.forEach(session => {
            const sessionExercises = new Set(session.exercises.map(ex => ex.exerciseId));
            sessionExercises.forEach(exerciseId => {
                exerciseCounts.set(exerciseId, (exerciseCounts.get(exerciseId) || 0) + 1);
            });
        });

        // FIX: Refactored to use objects instead of tuples to avoid potential type inference issues with sorting.
        const exercisesWithCounts = Array.from(exerciseCounts.entries()).map(
            ([exerciseId, count]) => ({ exerciseId, count })
        );
        const sortedExercises = exercisesWithCounts.sort((a, b) => b.count - a.count);
        const top3Ids = sortedExercises.slice(0, 3).map(entry => entry.exerciseId);

        const topExercisesChartData = top3Ids.map(exerciseId => {
            const exerciseInfo = getExerciseById(exerciseId);
            const data: ChartDataPoint[] = [];

            reversedHistory.forEach(session => {
                const exerciseInSession = session.exercises.find(ex => ex.exerciseId === exerciseId);
                if (exerciseInSession) {
                    const exerciseVolume = exerciseInSession.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
                    data.push({
                        date: session.startTime,
                        label: new Date(session.startTime).toLocaleDateString(undefined, dateFormat),
                        value: exerciseVolume
                    });
                }
            });

            return {
                exerciseInfo,
                data,
            };
        });

        return { totalVolume: totalVolumeData, topExercises: topExercisesChartData };
    }, [history, getExerciseById]);

    if (history.length === 0) {
        return (
          <div className="text-center text-text-secondary py-8">
            <p>{t('history_no_data')}</p>
          </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <ChartContainer title={t('graphs_total_volume')} data={chartData.totalVolume} color="#38bdf8" />

            {chartData.topExercises.map(({ exerciseInfo, data }, index) => {
                const colors = ["#818cf8", "#f87171", "#4ade80"];
                if (!exerciseInfo) return null;
                return (
                    <ChartContainer 
                        key={exerciseInfo.id}
                        title={`${exerciseInfo.name} - Volume`}
                        data={data}
                        color={colors[index % colors.length]}
                    />
                );
            })}

            {chartData.topExercises.length === 0 && chartData.totalVolume.length > 0 && (
                <div className="text-center text-text-secondary py-4">
                    <p>Not enough individual exercise data to generate more charts.</p>
                </div>
            )}
        </div>
    );
};

export default HistoryChartsTab;