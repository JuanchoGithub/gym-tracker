import React, { useContext, useMemo } from 'react';
import { WorkoutSession, SetType } from '../../types';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { useWeight } from '../../hooks/useWeight';
import { formatTime } from '../../utils/timeUtils';
import { getExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import Pill from '../common/Pill';

interface HistoryDetailModalProps {
  session: WorkoutSession;
  isOpen: boolean;
  onClose: () => void;
}

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-lg">
      <div className="text-primary">{icon}</div>
      <div>
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="font-bold text-sm">{value}</div>
      </div>
    </div>
);

const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ session, isOpen, onClose }) => {
    const { history: allHistory, getExerciseById } = useContext(AppContext);
    const { t } = useI18n();
    const { displayWeight, unit } = useWeight();

    const totalTime = session.endTime > 0 ? formatTime(Math.round((session.endTime - session.startTime) / 1000)) : 'N/A';
    const totalVolume = session.exercises.reduce((total, ex) => {
        return total + ex.sets.reduce((exTotal, set) => exTotal + (set.weight * set.reps), 0);
    }, 0);

    const exercisePerformances = useMemo(() => {
        if (!session) return {};
        const performances: { [key: string]: any } = {};
        session.exercises.forEach(ex => {
            const fullExHistory = getExerciseHistory(allHistory, ex.exerciseId);
            const currentSessionIndex = fullExHistory.findIndex(h => h.session.id === session.id);
            const previousPerformance = fullExHistory[currentSessionIndex + 1];
            performances[ex.id] = previousPerformance;
        });
        return performances;
    }, [session, allHistory]);

    const getComparisonPill = (current: number, prev: number | undefined) => {
        if (prev === undefined || isNaN(current) || isNaN(prev)) return null;
        const diff = current - prev;
        if (Math.abs(diff) < 0.01) return null; // Avoid showing pills for tiny float differences
        const diffStr = `${diff > 0 ? '+' : ''}${displayWeight(diff, true)}`;
        const type = diff > 0 ? 'increase' : 'decrease';
        return <Pill value={diffStr} type={type} />;
    };
    
    const getSetTypeStyles = (type: SetType) => {
        switch(type) {
            case 'warmup': return 'bg-[#1C354C]';
            case 'drop': return 'bg-[#343536]';
            case 'failure': return 'bg-[#332C3C]';
            default: return 'bg-transparent';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-[80vh] max-h-[600px]">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">{session.routineName}</h2>
                        <p className="text-sm text-text-secondary">{new Date(session.startTime).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1">
                        <Icon name="x" className="w-6 h-6" />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 flex-shrink-0">
                    <StatItem icon={<Icon name="history" className="w-5 h-5"/>} label={t('history_total_time')} value={totalTime} />
                    <StatItem icon={<Icon name="weight" className="w-5 h-5"/>} label={t('history_total_volume')} value={`${displayWeight(totalVolume, true)} ${t(`workout_${unit}`)}`} />
                    <StatItem icon={<Icon name="trophy" className="w-5 h-5"/>} label={t('history_prs')} value={session.prCount || 0} />
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-grow overflow-y-auto pr-2 space-y-4" style={{ overscrollBehaviorY: 'contain' }}>
                    {session.exercises.map(ex => {
                        const exerciseInfo = getExerciseById(ex.exerciseId);
                        const previousPerformance = exercisePerformances[ex.id];
                        let normalSetCounter = 0;

                        return (
                            <div key={ex.id} className="bg-slate-900/50 p-3 rounded-lg">
                                <h3 className="font-bold text-primary mb-2">{exerciseInfo?.name || t('history_page_unknown_exercise')}</h3>
                                <div className="text-xs text-text-secondary grid grid-cols-12 gap-x-2 font-semibold border-b border-secondary/20 pb-1 mb-2">
                                    <span className="col-span-1 text-center">Set</span>
                                    <span className="col-span-3">Weight</span>
                                    <span className="col-span-3">Reps</span>
                                    <span className="col-span-5">e1RM</span>
                                </div>
                                <div className="space-y-1">
                                    {ex.sets.map((set) => {
                                        if (set.type === 'normal') normalSetCounter++;
                                        const prevSet = previousPerformance?.exerciseData.sets.find((s: any) => s.id === set.id);
                                        const current1RM = calculate1RM(set.weight, set.reps);
                                        const prev1RM = prevSet ? calculate1RM(prevSet.weight, prevSet.reps) : undefined;
                                        
                                        const renderSetIdentifier = () => {
                                            switch(set.type) {
                                                case 'warmup': return 'W';
                                                case 'drop': return 'D';
                                                case 'failure': return 'F';
                                                default: return normalSetCounter;
                                            }
                                        };
                                        
                                        return (
                                            <div key={set.id} className={`text-sm grid grid-cols-12 gap-x-2 items-center p-1 rounded-md ${getSetTypeStyles(set.type)}`}>
                                                <div className="col-span-1 flex justify-center">
                                                    <div className={`text-center font-bold ${set.type !== 'normal' ? 'text-primary' : ''} bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center`}>
                                                        {renderSetIdentifier()}
                                                    </div>
                                                </div>
                                                <div className="col-span-3 flex items-center gap-1">
                                                    <span>{displayWeight(set.weight)} {t(`workout_${unit}`)}</span>
                                                    {getComparisonPill(set.weight, prevSet?.weight)}
                                                </div>
                                                <div className="col-span-3 flex items-center gap-1">
                                                    <span>{set.reps} reps</span>
                                                     {getComparisonPill(set.reps, prevSet?.reps)}
                                                </div>
                                                <div className="col-span-5 flex items-center gap-1">
                                                    <span>{displayWeight(current1RM)} {t(`workout_${unit}`)}</span>
                                                    {getComparisonPill(current1RM, prev1RM)}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Modal>
    )
};

export default HistoryDetailModal;