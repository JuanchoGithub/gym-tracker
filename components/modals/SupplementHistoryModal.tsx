
import React, { useMemo, useContext } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { SupplementPlanItem, WorkoutSession } from '../../types';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { getDateString } from '../../utils/timeUtils';
import { TranslationKey } from '../../contexts/I18nContext';

interface SupplementHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: SupplementPlanItem;
}

const SupplementHistoryModal: React.FC<SupplementHistoryModalProps> = ({ isOpen, onClose, item }) => {
    const { takenSupplements, history } = useContext(AppContext);
    const { t } = useI18n();

    const historyData = useMemo(() => {
        const days = [];
        const today = new Date();
        
        // Generate last 14 days
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateString = getDateString(d);
            
            // Check if taken
            const isTaken = takenSupplements[dateString]?.includes(item.id);
            
            // Check if it was a training day based on actual workout history
            // We look for a workout started on that calendar day
            const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const endOfDay = startOfDay + 86400000;
            const wasTrainingDay = history.some(s => s.startTime >= startOfDay && s.startTime < endOfDay);

            let status: 'taken' | 'missed' | 'skipped' = 'skipped';

            if (isTaken) {
                status = 'taken';
            } else {
                // Determine if it was scheduled
                let isScheduled = true;
                if (item.trainingDayOnly && !wasTrainingDay) isScheduled = false;
                if (item.restDayOnly && wasTrainingDay) isScheduled = false;
                
                if (isScheduled) {
                    status = 'missed';
                }
            }

            days.push({ date: d, status, isToday: i === 0 });
        }
        return days;
    }, [takenSupplements, history, item]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item.supplement}>
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-text-secondary uppercase tracking-wider px-2">
                    <span>{t('supplements_history_date' as TranslationKey)}</span>
                    <span>{t('supplements_history_status' as TranslationKey)}</span>
                </div>
                
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {historyData.map((day) => (
                        <div 
                            key={day.date.toISOString()} 
                            className={`flex items-center justify-between p-3 rounded-xl border ${
                                day.isToday ? 'bg-surface-highlight border-white/10' : 'bg-surface/50 border-white/5'
                            }`}
                        >
                            <div>
                                <p className={`font-medium ${day.isToday ? 'text-white' : 'text-text-secondary'}`}>
                                    {day.isToday 
                                        ? t('supplements_tab_today') 
                                        : day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                                    }
                                </p>
                            </div>
                            
                            <div className="flex items-center">
                                {day.status === 'taken' && (
                                    <span className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1 rounded-lg text-xs font-bold border border-green-500/20">
                                        <Icon name="check" className="w-3 h-3" />
                                        {t('supplements_history_taken' as TranslationKey)}
                                    </span>
                                )}
                                {day.status === 'missed' && (
                                    <span className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1 rounded-lg text-xs font-bold border border-red-500/20">
                                        <Icon name="x" className="w-3 h-3" />
                                        {t('supplements_history_missed' as TranslationKey)}
                                    </span>
                                )}
                                {day.status === 'skipped' && (
                                    <span className="text-text-secondary/40 text-xs font-medium px-3">
                                        {t('supplements_history_skipped' as TranslationKey)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-xs text-indigo-200 flex gap-2">
                    <Icon name="question-mark-circle" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                        {t('supplements_history_disclaimer' as TranslationKey)}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default SupplementHistoryModal;