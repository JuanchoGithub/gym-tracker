
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SupplementPlanItem } from '../../types';
import { TranslationKey } from '../../contexts/I18nContext';

interface AddSupplementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => void;
    initialData?: SupplementPlanItem | null;
}

const TIME_OPTIONS = [
    'supplements_time_morning',
    'supplements_time_lunch',
    'supplements_time_evening',
    'supplements_time_pre_workout',
    'supplements_time_intra_workout',
    'supplements_time_post_workout',
    'supplements_time_daily',
    'supplements_time_with_meal'
];

const AddSupplementModal: React.FC<AddSupplementModalProps> = ({ isOpen, onClose, onAdd, initialData }) => {
    const { t } = useI18n();
    const [supplement, setSupplement] = useState('');
    const [dosage, setDosage] = useState('');
    const [time, setTime] = useState(TIME_OPTIONS[0]); // Key
    const [notes, setNotes] = useState('');
    const [stock, setStock] = useState('');
    const [frequency, setFrequency] = useState<'everyday' | 'training' | 'rest'>('everyday');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setSupplement(initialData.supplement);
                setDosage(initialData.dosage);
                
                // Correctly set the time key. If the stored time is a key, use it. 
                // If it's a legacy translated string, try to find the matching key.
                let matchedKey = TIME_OPTIONS[6]; // Default to Daily
                
                if (TIME_OPTIONS.includes(initialData.time)) {
                    matchedKey = initialData.time;
                } else {
                    // Legacy check: Try to reverse lookup translation
                    const found = TIME_OPTIONS.find(key => t(key as TranslationKey) === initialData.time);
                    if (found) matchedKey = found;
                }
                
                setTime(matchedKey);

                setNotes(initialData.notes);
                setStock(initialData.stock !== undefined ? initialData.stock.toString() : '');
                if (initialData.trainingDayOnly) setFrequency('training');
                else if (initialData.restDayOnly) setFrequency('rest');
                else setFrequency('everyday');
            } else {
                // Reset form for fresh add
                setSupplement('');
                setDosage('');
                setTime(TIME_OPTIONS[0]);
                setNotes('');
                setStock('');
                setFrequency('everyday');
            }
        }
    }, [isOpen, initialData, t]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplement.trim()) {
            alert(t('supplements_add_name_required'));
            return;
        }
        
        const stockVal = stock ? parseInt(stock, 10) : undefined;

        const newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'> = { 
            supplement, 
            dosage, 
            time: time, // Save the key directly
            notes, 
            stock: stockVal,
            trainingDayOnly: frequency === 'training',
            restDayOnly: frequency === 'rest'
        };

        onAdd(newItem);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('supplements_add_modal_title')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="supplement-name" className="block text-sm font-medium text-text-secondary">{t('supplements_add_name_label')}</label>
                    <input
                        id="supplement-name"
                        type="text"
                        value={supplement}
                        onChange={(e) => setSupplement(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_name_placeholder')}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="supplement-dosage" className="block text-sm font-medium text-text-secondary">{t('supplements_add_dosage_label')}</label>
                    <input
                        id="supplement-dosage"
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_dosage_placeholder')}
                    />
                </div>
                <div>
                    <label htmlFor="supplement-time" className="block text-sm font-medium text-text-secondary">{t('supplements_add_time_label')}</label>
                    <select
                        id="supplement-time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-white"
                    >
                        {TIME_OPTIONS.map(key => (
                            <option key={key} value={key}>{t(key as TranslationKey)}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('supplements_add_frequency_label')}</label>
                    <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={() => setFrequency('everyday')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${frequency === 'everyday' ? 'bg-primary/20 text-primary border-primary' : 'bg-surface border-white/10 text-text-secondary'}`}
                        >
                            {t('supplements_frequency_everyday')}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFrequency('training')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${frequency === 'training' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500' : 'bg-surface border-white/10 text-text-secondary'}`}
                        >
                            {t('supplements_frequency_training')}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFrequency('rest')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${frequency === 'rest' ? 'bg-teal-500/20 text-teal-300 border-teal-500' : 'bg-surface border-white/10 text-text-secondary'}`}
                        >
                            {t('supplements_frequency_rest')}
                        </button>
                    </div>
                </div>

                <div>
                    <label htmlFor="supplement-stock" className="block text-sm font-medium text-text-secondary">{t('supplements_add_stock_label')}</label>
                    <input
                        id="edit-supplement-stock"
                        type="number"
                        inputMode="numeric"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_stock_placeholder')}
                    />
                </div>

                <div>
                    <label htmlFor="supplement-notes" className="block text-sm font-medium text-text-secondary">{t('supplements_add_notes_label')}</label>
                    <textarea
                        id="supplement-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_notes_placeholder')}
                        rows={3}
                    />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="bg-secondary px-4 py-2 rounded-lg">{t('common_cancel')}</button>
                    <button type="submit" className="bg-primary px-4 py-2 rounded-lg">{t('common_add')}</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddSupplementModal;
