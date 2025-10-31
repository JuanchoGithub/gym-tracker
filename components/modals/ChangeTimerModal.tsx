import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { TranslationKey } from '../../contexts/I18nContext';
import { formatSecondsToMMSS, parseTimerInput } from '../../utils/timeUtils';
import { Icon } from '../common/Icon';

interface ChangeTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRestTimes: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; };
  onSave: (newTimes: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }) => void;
}

const ChangeTimerModal: React.FC<ChangeTimerModalProps> = ({ isOpen, onClose, currentRestTimes, onSave }) => {
    const { t } = useI18n();
    const [times, setTimes] = useState(currentRestTimes || { normal: 90, warmup: 0, drop: 0, timed: 10, effort: 180, failure: 300 });
    const [editingKey, setEditingKey] = useState<keyof typeof times | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [infoModalContent, setInfoModalContent] = useState<{title: string, message: string} | null>(null);

    useEffect(() => {
        if (typeof currentRestTimes === 'object' && currentRestTimes !== null) {
            setTimes(prev => ({ ...prev, ...currentRestTimes }));
        } else {
            const legacyTime = typeof currentRestTimes === 'number' ? currentRestTimes : 90;
            setTimes({ normal: legacyTime, warmup: 60, drop: 30, timed: 10, effort: 180, failure: 300 });
        }
    }, [currentRestTimes]);

    const handleSave = () => {
        onSave(times);
        onClose();
    };
    
    const handleEdit = (key: keyof typeof times) => {
        setEditingKey(key);
        setTempValue(''); // Start with an empty string for cleaner editing
    };
    
    const handleBlur = () => {
        if (editingKey) {
            const newTimeInSeconds = parseTimerInput(tempValue);
            setTimes(prev => ({...prev, [editingKey]: newTimeInSeconds}));
        }
        setEditingKey(null);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 5) {
            setTempValue(val);
        }
    };

    const timerInputs: { key: keyof typeof times, labelKey: TranslationKey, infoKey: {title: TranslationKey, message: TranslationKey} }[] = [
        { key: 'normal', labelKey: 'timer_normal', infoKey: {title: 'timer_normal_desc_title', message: 'timer_normal_desc'} },
        { key: 'warmup', labelKey: 'timer_warmup', infoKey: {title: 'timer_warmup_desc_title', message: 'timer_warmup_desc'} },
        { key: 'drop', labelKey: 'timer_drop', infoKey: {title: 'timer_drop_desc_title', message: 'timer_drop_desc'} },
        { key: 'timed', labelKey: 'timer_timed', infoKey: {title: 'timer_timed_desc_title', message: 'timer_timed_desc'} },
        { key: 'effort', labelKey: 'timer_effort', infoKey: {title: 'timer_effort_desc_title', message: 'timer_effort_desc'} },
        { key: 'failure', labelKey: 'timer_failure', infoKey: {title: 'timer_failure_desc_title', message: 'timer_failure_desc'} },
    ];

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t('timer_modal_title')}>
                <div className="space-y-4">
                    <div className="text-center text-sm text-text-secondary -mt-2">
                        <p>{t('timer_modal_subtitle_1')}</p>
                        <p>{t('timer_modal_subtitle_2')}</p>
                    </div>

                    <div className="space-y-3">
                        {timerInputs.map(({ key, labelKey, infoKey }) => (
                            <div key={key} className="flex justify-between items-center text-lg p-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-text-primary">{t(labelKey)}</span>
                                    {infoKey && (
                                        <button onClick={() => setInfoModalContent({title: t(infoKey.title), message: t(infoKey.message)})}>
                                            <Icon name="question-mark-circle" className="w-5 h-5 text-text-secondary" />
                                        </button>
                                    )}
                                </div>
                                {editingKey === key ? (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={tempValue}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="bg-slate-900 border border-primary rounded-lg p-2 w-28 text-center"
                                        placeholder="m:ss or secs"
                                    />
                                ) : (
                                    <button 
                                        onClick={() => handleEdit(key)}
                                        className="bg-slate-200 text-slate-800 font-mono rounded-lg px-4 py-2 w-28 text-center hover:bg-slate-300 transition-colors"
                                    >
                                        {times[key] > 0 ? formatSecondsToMMSS(times[key]) : t('timer_modal_none')}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <button
                        onClick={handleSave}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
                    >
                        {t('timer_modal_update_button')}
                    </button>
                </div>
            </Modal>
            {infoModalContent && (
                <Modal isOpen={!!infoModalContent} onClose={() => setInfoModalContent(null)} title={infoModalContent.title}>
                    <p className="text-text-secondary">{infoModalContent.message}</p>
                </Modal>
            )}
        </>
    );
};

export default ChangeTimerModal;