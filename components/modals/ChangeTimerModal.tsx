import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { TranslationKey } from '../../contexts/I18nContext';

interface ChangeTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRestTimes: { normal: number; warmup: number; drop: number; };
  onSave: (newTimes: { normal: number; warmup: number; drop: number; }) => void;
}

const formatSecondsToMMSS = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
};

const parseTimerInput = (input: string): number => {
    const digits = input.replace(/\D/g, '');
    const len = digits.length;

    if (len === 0) return 0;
    
    // For 1 or 2 digits, always treat as total seconds
    // e.g., "45" -> 45s; "90" -> 90s (1:30)
    if (len <= 2) {
        return parseInt(digits, 10);
    }

    // For 3-5 digits, try to parse as m:ss, mm:ss, or mmm:ss
    // If the last two digits are < 60, parse it that way
    // e.g., "148" -> 1m 48s = 108s
    const secondsPart = parseInt(digits.slice(-2), 10);
    if (secondsPart < 60) {
        const minutesPart = parseInt(digits.slice(0, -2), 10);
        return minutesPart * 60 + secondsPart;
    }
    
    // Otherwise (last two digits >= 60), treat the whole number as seconds
    // e.g., "199" -> 199s
    return parseInt(digits, 10);
};


const ChangeTimerModal: React.FC<ChangeTimerModalProps> = ({ isOpen, onClose, currentRestTimes, onSave }) => {
    const { t } = useI18n();
    const [times, setTimes] = useState(currentRestTimes || { normal: 90, warmup: 0, drop: 0 });
    const [editingKey, setEditingKey] = useState<keyof typeof times | null>(null);
    const [tempValue, setTempValue] = useState('');

    useEffect(() => {
        if (typeof currentRestTimes === 'object' && currentRestTimes !== null) {
            setTimes(currentRestTimes);
        } else {
            const legacyTime = typeof currentRestTimes === 'number' ? currentRestTimes : 90;
            setTimes({ normal: legacyTime, warmup: 60, drop: 30 });
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

    const timerInputs: { key: keyof typeof times, labelKey: TranslationKey }[] = [
        { key: 'normal', labelKey: 'timer_normal' },
        { key: 'warmup', labelKey: 'timer_warmup' },
        { key: 'drop', labelKey: 'timer_drop' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('timer_modal_title')}>
            <div className="space-y-6">
                <div className="text-center text-sm text-text-secondary -mt-2">
                    <p>{t('timer_modal_subtitle_1')}</p>
                    <p>{t('timer_modal_subtitle_2')}</p>
                </div>

                <div className="space-y-3">
                    {timerInputs.map(({ key, labelKey }) => (
                        <div key={key} className="flex justify-between items-center text-lg p-1">
                            <span className="font-semibold text-text-primary">{t(labelKey)}</span>
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
    );
};

export default ChangeTimerModal;