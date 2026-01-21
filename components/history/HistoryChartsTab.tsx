
import React, { useMemo, useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { WorkoutSession, ChartDataPoint, HistoryChartConfig } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import ChartBlock from '../common/ChartBlock';
import FullScreenChartModal from '../common/FullScreenChartModal';
import { useExerciseName } from '../../hooks/useExerciseName';
import { Icon } from '../common/Icon';
import AddExercisesModal from '../modals/AddExercisesModal';

interface HistoryChartsTabProps {
    history: WorkoutSession[];
}

interface FullScreenChartData {
    title: string;
    data: ChartDataPoint[];
    color?: string;
}

const HistoryChartsTab: React.FC<HistoryChartsTabProps> = ({ history }) => {
    const { getExerciseById, profile, updateHistoryChartConfigs, rawExercises } = useContext(AppContext);
    const { t } = useI18n();
    const getExerciseName = useExerciseName();
    const [fullScreenChart, setFullScreenChart] = useState<FullScreenChartData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingExercise, setIsAddingExercise] = useState(false);

    const colors = ["#818cf8", "#f87171", "#4ade80", "#fbbf24", "#a78bfa", "#f472b6", "#2dd4bf", "#fb923c", "#94a3b8", "#c084fc"];

    const recentHistory = useMemo(() => history.slice(0, 40), [history]);
    const chronologicalHistory = useMemo(() => [...recentHistory].sort((a, b) => a.startTime - b.startTime), [recentHistory]);
    const dateFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    const exerciseFrequency = useMemo(() => {
        const counts = new Map<string, number>();
        recentHistory.forEach(session => {
            const distinctExercises = new Set(session.exercises.map(ex => ex.exerciseId));
            distinctExercises.forEach((exerciseId: string) => {
                counts.set(exerciseId, (counts.get(exerciseId) || 0) + 1);
            });
        });
        return counts;
    }, [recentHistory]);

    const chartConfigs = useMemo((): HistoryChartConfig[] => {
        if (profile.historyChartConfigs && profile.historyChartConfigs.length > 0) {
            return profile.historyChartConfigs;
        }

        // Default: Total Volume + Top 5 frequent exercises
        const defaultConfigs: HistoryChartConfig[] = [{ id: 'total-volume', type: 'total-volume' }];

        const sortedExercises = Array.from(exerciseFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        sortedExercises.forEach(([exerciseId]) => {
            defaultConfigs.push({ id: exerciseId, type: 'exercise-volume', exerciseId });
        });

        return defaultConfigs;
    }, [profile.historyChartConfigs, exerciseFrequency]);

    const preparedCharts = useMemo(() => {
        return chartConfigs.map((config, index) => {
            if (config.type === 'total-volume') {
                const data: ChartDataPoint[] = chronologicalHistory.map(session => {
                    const totalVolume = session.exercises.reduce((total, ex) => {
                        return total + ex.sets.reduce((exTotal, set) => exTotal + (set.isComplete ? (set.weight * set.reps) : 0), 0);
                    }, 0);
                    return {
                        date: session.startTime,
                        label: new Date(session.startTime).toLocaleDateString(undefined, dateFormat),
                        value: totalVolume,
                    };
                });
                return {
                    config,
                    title: t('graphs_total_volume'),
                    data,
                    color: '#38bdf8',
                    filenamePrefix: 'History'
                };
            } else {
                const exerciseId = config.exerciseId!;
                const exerciseInfo = getExerciseById(exerciseId);
                const data: ChartDataPoint[] = [];

                chronologicalHistory.forEach(session => {
                    const exercisesInSession = session.exercises.filter(ex => ex.exerciseId === exerciseId);
                    if (exercisesInSession.length > 0) {
                        const exerciseVolume = exercisesInSession.reduce((vol, ex) => {
                            return vol + ex.sets.reduce((sum, set) => sum + (set.isComplete ? (set.weight * set.reps) : 0), 0);
                        }, 0);

                        if (exerciseVolume > 0) {
                            data.push({
                                date: session.startTime,
                                label: new Date(session.startTime).toLocaleDateString(undefined, dateFormat),
                                value: exerciseVolume
                            });
                        }
                    }
                });

                const name = exerciseInfo ? getExerciseName(exerciseInfo) : t('history_page_unknown_exercise');
                return {
                    config,
                    title: `${name} - Volume`,
                    data,
                    color: colors[index % colors.length],
                    filenamePrefix: name,
                    exerciseInfo
                };
            }
        });
    }, [chartConfigs, chronologicalHistory, t, getExerciseById, getExerciseName, colors]);

    const handleRemove = (id: string) => {
        const nextConfigs = chartConfigs.filter(c => c.id !== id);
        updateHistoryChartConfigs(nextConfigs);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const nextConfigs = [...chartConfigs];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= nextConfigs.length) return;

        const temp = nextConfigs[index];
        nextConfigs[index] = nextConfigs[targetIndex];
        nextConfigs[targetIndex] = temp;

        updateHistoryChartConfigs(nextConfigs);
    };

    const handleAddExercise = (exerciseIds: string[]) => {
        const currentIds = new Set(chartConfigs.map(c => c.id));
        const newConfigs = [...chartConfigs];

        exerciseIds.forEach(id => {
            if (!currentIds.has(id)) {
                newConfigs.push({ id, type: 'exercise-volume', exerciseId: id });
            }
        });

        updateHistoryChartConfigs(newConfigs.slice(0, 10));
        setIsAddingExercise(false);
    };

    const handleQuickAdd = () => {
        // Find last few routines (say 5)
        const lastRoutines = history.slice(0, 5);
        const exercisesFromLastRoutines = new Map<string, number>();

        lastRoutines.forEach(session => {
            const distinct = new Set(session.exercises.map(ex => ex.exerciseId));
            distinct.forEach(id => {
                exercisesFromLastRoutines.set(id, (exercisesFromLastRoutines.get(id) || 0) + 1);
            });
        });

        const sortedByFreq = Array.from(exercisesFromLastRoutines.entries())
            .sort((a, b) => b[1] - a[1]);

        const nextConfigs: HistoryChartConfig[] = [{ id: 'total-volume', type: 'total-volume' }];
        const currentIds = new Set(['total-volume']);

        // Fill up to 10
        sortedByFreq.forEach(([id]) => {
            if (nextConfigs.length < 10 && !currentIds.has(id)) {
                nextConfigs.push({ id, type: 'exercise-volume', exerciseId: id });
                currentIds.add(id);
            }
        });

        updateHistoryChartConfigs(nextConfigs);
    };

    if (history.length === 0) {
        return (
            <div className="text-center text-text-secondary py-8">
                <p>{t('history_no_data')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-bold text-text-primary">{isEditing ? t('common_edit') : t('tab_graphs')}</h2>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isEditing ? 'bg-primary text-white' : 'bg-surface-highlight/20 text-text-secondary hover:bg-surface-highlight/40'}`}
                >
                    <Icon name={isEditing ? 'check' : 'edit'} className="w-4 h-4" />
                    <span>{isEditing ? t('common_save') : t('common_edit')}</span>
                </button>
            </div>

            {isEditing && (
                <div className="bg-surface p-4 rounded-lg space-y-4 border border-primary/20">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setIsAddingExercise(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Icon name="plus" className="w-4 h-4" />
                            {t('history_menu_edit')} Exercises
                        </button>
                        <button
                            onClick={handleQuickAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-blue-500/30"
                        >
                            <Icon name="history" className="w-4 h-4 text-blue-400" />
                            Add Last Exercises
                        </button>
                    </div>

                    <div className="space-y-2">
                        {preparedCharts.map((item, index) => (
                            <div key={item.config.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="font-medium truncate">{item.title}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleMove(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1.5 text-text-secondary hover:text-primary disabled:opacity-30"
                                    >
                                        <Icon name="chevron-up" className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleMove(index, 'down')}
                                        disabled={index === preparedCharts.length - 1}
                                        className="p-1.5 text-text-secondary hover:text-primary disabled:opacity-30"
                                    >
                                        <Icon name="chevron-down" className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleRemove(item.config.id)}
                                        className="p-1.5 text-text-secondary hover:text-red-400"
                                    >
                                        <Icon name="trash" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {preparedCharts.length >= 10 && (
                        <p className="text-xs text-yellow-500/80 italic">Limit of 10 charts reached.</p>
                    )}
                </div>
            )}

            {!isEditing && preparedCharts.map((item) => {
                if (item.config.type === 'exercise-volume' && !item.exerciseInfo) return null;
                return (
                    <ChartBlock
                        key={item.config.id}
                        title={item.title}
                        data={item.data}
                        color={item.color}
                        filenamePrefix={item.filenamePrefix}
                        onFullScreen={() => setFullScreenChart({ title: item.title, data: item.data, color: item.color })}
                    />
                );
            })}

            {!isEditing && preparedCharts.length === 0 && (
                <div className="text-center text-text-secondary py-8">
                    <p>No charts configured. Add some in Edit mode!</p>
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

            <AddExercisesModal
                isOpen={isAddingExercise}
                onClose={() => setIsAddingExercise(false)}
                onAdd={handleAddExercise}
                initialExercises={rawExercises}
            />
        </div>
    );
};

export default HistoryChartsTab;
