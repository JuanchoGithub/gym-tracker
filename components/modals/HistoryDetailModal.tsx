
import React, { useContext, useMemo } from 'react';
import { WorkoutSession, SetType } from '../../types';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
// FIX: Replaced `useWeight` with the correct `useMeasureUnit` hook.
import { useMeasureUnit } from '../../hooks/useWeight';
import { formatTime } from '../../utils/timeUtils';
import { getExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import Pill from '../common/Pill';
import { TranslationKey } from '../../contexts/I18nContext';

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
    // FIX: Replaced `useWeight` with `useMeasureUnit` and destructured `weightUnit`.
    const { displayWeight, weightUnit } = useMeasureUnit();

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
            <div className="flex flex-col h-full max-h-[70vh]">
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-lg text-primary">{session.routineName}</h2>
                        <span className="text-sm text-text-secondary">{new Date(session.startTime).toLocaleString()}</span>
                    </div>
                    <button onClick={onClose} className="p-1 -m-1 text-text-secondary hover:text-primary"><Icon name="x" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4 flex-shrink-0">
                    <StatItem icon={<Icon name="history" className="w-5 h-5"/>} label={t('history_total_time')} value={totalTime} />
                    <StatItem icon={<Icon name="weight" className="w-5 h-5"/>} label={t('history_total_volume')} value={`${displayWeight(totalVolume, true)} ${t(`workout_${weightUnit}` as TranslationKey)}`} />
                    <StatItem icon={<Icon name="trophy" className="w-5 h-5"/>} label={t('history_prs')} value={session.prCount || 0} />
                </div>

                <div className="flex-grow space-y-3 overflow-y-auto pr-2" style={{ overscrollBehaviorY: 'contain' }}>
                    {session.exercises.map(ex => {
                        const exerciseInfo = getExerciseById(ex.exerciseId);
                        if (!exerciseInfo) return null;
                        const previousPerformance = exercisePerformances[ex.id];
                        return (
                            <div key={ex.id} className="bg-slate-900/50 p-3 rounded-lg">
                                <h4 className="font-bold text-text-primary mb-2">{exerciseInfo.name}</h4>
                                <div className="text-xs space-y-1">
                                    <div className="grid grid-cols-12 gap-2 font-semibold text-text-secondary border-b border-secondary/20 pb-1">
                                        <div className="col-span-1">Set</div>
                                        <div className="col-span-5">Perf.</div>
                                        <div className="col-span-3 text-right">Vol</div>
                                        <div className="col-span-3 text-right">e1RM</div>
                                    </div>
                                    {ex.sets.map((set, setIndex) => {
                                        const prevSet = previousPerformance?.exerciseData.sets[setIndex];
                                        const volume = set.weight * set.reps;
                                        const prevVolume = prevSet ? prevSet.weight * prevSet.reps : undefined;
                                        const est1RM = calculate1RM(set.weight, set.reps);
                                        const prevEst1RM = prevSet ? calculate1RM(prevSet.weight, prevSet.reps) : undefined;

                                        return (
                                            <div key={set.id} className={`grid grid-cols-12 gap-2 items-center text-sm py-1 rounded -mx-1 px-1 ${getSetTypeStyles(set.type)}`}>
                                                <div className="col-span-1 font-bold">{setIndex + 1}</div>
                                                <div className="col-span-5 font-mono flex items-center">{displayWeight(set.weight)}{t(`workout_${weightUnit}` as TranslationKey)} x {set.reps}</div>
                                                <div className="col-span-3 text-right font-mono flex items-center justify-end">
                                                    <span>{displayWeight(volume)}</span>
                                                    {getComparisonPill(volume, prevVolume)}
                                                </div>
                                                <div className="col-span-3 text-right font-mono flex items-center justify-end">
                                                    <span>{displayWeight(est1RM, true)}</span>
                                                    {getComparisonPill(est1RM, prevEst1RM)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

export default HistoryDetailModal;