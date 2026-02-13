
import React, { useContext, useMemo } from 'react';
import { WorkoutSession, SetType } from '../../types';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { useMeasureUnit } from '../../hooks/useWeight';
import { formatDurationCompact } from '../../utils/timeUtils';
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
    <div className="flex flex-col justify-between bg-slate-900/40 border border-white/5 p-2 rounded-lg h-full">
        <div className="flex items-center space-x-1.5 mb-0.5">
            <div className="text-primary w-4 h-4">{icon}</div>
            <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wide">{label}</div>
        </div>
        <div className="font-bold text-base leading-none text-right">{value}</div>
    </div>
);

const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ session, isOpen, onClose }) => {
    const { history: allHistory, getExerciseById } = useContext(AppContext);
    const { t } = useI18n();
    const { displayWeight, weightUnit } = useMeasureUnit();

    const titleLen = session.routineName.length;
    const titleClass = titleLen > 35 ? 'text-sm' : titleLen > 25 ? 'text-base' : titleLen > 20 ? 'text-lg' : 'text-xl';

    const totalTime = session.endTime > 0 ? formatDurationCompact(Math.round((session.endTime - session.startTime) / 1000)) : 'N/A';
    const totalVolume = session.exercises.reduce((total, ex) => {
        return total + ex.sets.reduce((exTotal, set) => exTotal + (set.isComplete ? (set.weight * set.reps) : 0), 0);
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
        if (Math.abs(diff) < 0.01) return null;
        const diffStr = `${diff > 0 ? '+' : ''}${displayWeight(diff, true)}`;
        const type = diff > 0 ? 'increase' : 'decrease';
        return <Pill value={diffStr} type={type} />;
    };

    const getSetTypeStyles = (type: SetType) => {
        switch (type) {
            case 'warmup': return 'bg-[#1C354C]';
            case 'drop': return 'bg-[#343536]';
            case 'failure': return 'bg-[#332C3C]';
            default: return 'bg-transparent';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            contentClassName="bg-[#0f172a] w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl m-0 sm:m-4 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-none sm:border sm:border-white/10"
        >
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-start p-4 sm:p-6 pb-0 flex-shrink-0 bg-[#0f172a] z-10 overflow-hidden">
                    <div className="min-w-0 pr-4">
                        <h2 className={`font-bold ${titleClass} text-primary leading-tight whitespace-nowrap overflow-hidden text-ellipsis`}>{session.routineName}</h2>
                        <span className="text-sm text-text-secondary">{new Date(session.startTime).toLocaleString()}</span>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-text-secondary hover:text-primary rounded-full hover:bg-white/5 transition-colors flex-shrink-0">
                        <Icon name="x" className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 sm:px-6 pb-2 grid grid-cols-3 gap-2 flex-shrink-0 bg-[#0f172a] border-b border-white/5">
                    <StatItem icon={<Icon name="history" className="w-full h-full" />} label={t('history_total_time')} value={totalTime} />
                    <StatItem icon={<Icon name="weight" className="w-full h-full" />} label={t('history_total_volume')} value={`${displayWeight(totalVolume, true)} ${t(`workout_${weightUnit}` as TranslationKey)}`} />
                    <StatItem icon={<Icon name="trophy" className="w-full h-full" />} label={t('history_prs')} value={session.prCount || 0} />
                </div>

                <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4" style={{ overscrollBehaviorY: 'contain' }}>
                    {session.exercises.map(ex => {
                        const exerciseInfo = getExerciseById(ex.exerciseId);
                        if (!exerciseInfo) return null;
                        const previousPerformance = exercisePerformances[ex.id];
                        return (
                            <div key={ex.id} className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                                <h4 className="font-bold text-text-primary mb-3 text-base flex items-center gap-2">
                                    {exerciseInfo.name}
                                </h4>
                                <div className="text-xs space-y-1">
                                    <div className="grid grid-cols-12 gap-2 font-bold text-text-secondary/60 uppercase tracking-wider border-b border-white/5 pb-2 mb-1">
                                        <div className="col-span-1 text-center">#</div>
                                        <div className="col-span-5">Performance</div>
                                        <div className="col-span-3 text-right">Vol</div>
                                        <div className="col-span-3 text-right">e1RM</div>
                                    </div>
                                    {ex.sets.map((set, setIndex) => {
                                        const prevSet = previousPerformance?.exerciseData.sets[setIndex];
                                        const volume = set.weight * set.reps;
                                        const prevVolume = prevSet ? prevSet.weight * prevSet.reps : undefined;
                                        const est1RM = calculate1RM(set.weight, set.reps);
                                        const prevEst1RM = prevSet ? calculate1RM(prevSet.weight, prevSet.reps) : undefined;
                                        const isCompleteStyle = set.isComplete ? '' : 'opacity-50 line-through text-text-secondary';

                                        return (
                                            <div key={set.id} className={`grid grid-cols-12 gap-2 items-center text-sm py-1.5 rounded px-1 ${getSetTypeStyles(set.type)} ${isCompleteStyle}`}>
                                                <div className="col-span-1 font-bold text-text-secondary text-center">{setIndex + 1}</div>
                                                <div className="col-span-5 font-mono font-medium text-text-primary whitespace-nowrap">
                                                    {displayWeight(set.weight)}<span className="text-xs text-text-secondary/50 ml-px mr-1">{t(`workout_${weightUnit}` as TranslationKey)}</span>
                                                    <span className="text-text-secondary/40 mx-1">×</span>
                                                    {set.reps}
                                                </div>
                                                <div className="col-span-3 text-right font-mono flex flex-col items-end justify-center leading-tight">
                                                    <span className="text-text-secondary">{displayWeight(volume)}</span>
                                                    {getComparisonPill(volume, prevVolume)}
                                                </div>
                                                <div className="col-span-3 text-right font-mono flex flex-col items-end justify-center leading-tight">
                                                    <span className="text-primary font-semibold">{displayWeight(est1RM, true)}</span>
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
