
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SupplementPlanItem } from '../../types';
import { TranslationKey } from '../../contexts/I18nContext';

interface EditSupplementModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: SupplementPlanItem;
    onSave: (updates: Partial<SupplementPlanItem>) => void;
    isGenerated: boolean;
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

const EditSupplementModal: React.FC<EditSupplementModalProps> = ({ isOpen, onClose, item, onSave, isGenerated }) => {
    const { t } = useI18n();
    const [supplement, setSupplement] = useState('');
    const [dosage, setDosage] = useState('');
    const [time, setTime] = useState(TIME_OPTIONS[0]);
    const [notes, setNotes] = useState('');
    const [stock, setStock] = useState('');
    const [frequency, setFrequency] = useState<'everyday' | 'training' | 'rest'>('everyday');

    useEffect(() => {
        if (isOpen && item) {
            setSupplement(item.supplement);
            setDosage(item.dosage);
            
            // Match time string to key or default
            const matchedKey = TIME_OPTIONS.find(key => t(key as TranslationKey) === item.time) || TIME_OPTIONS[6];
            setTime(matchedKey);

            setNotes(item.notes);
            setStock(item.stock !== undefined ? item.stock.toString() : '');
            
            if (item.trainingDayOnly) setFrequency('training');
            else if (item.restDayOnly) setFrequency('rest');
            else setFrequency('everyday');
        }
    }, [isOpen, item, t]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplement.trim()) {
            alert(t('supplements_add_name_required'));
            return;
        }
        
        const stockVal = stock ? parseInt(stock, 10) : undefined;

        const updates: Partial<SupplementPlanItem> = {
            stock: stockVal,
            notes: notes,
            time: t(time as TranslationKey), // Save translated string
            trainingDayOnly: frequency === 'training',
            restDayOnly: frequency === 'rest'
        };

        if (!isGenerated) {
            updates.supplement = supplement;
            updates.dosage = dosage;
        }

        onSave(updates);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('supplements_edit_modal_title')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {isGenerated && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg mb-2">
                        <p className="text-xs text-yellow-200">{t('supplements_edit_generated_locked')}</p>
                    </div>
                )}
                
                <div>
                    <label htmlFor="edit-supplement-name" className="block text-sm font-medium text-text-secondary">{t('supplements_add_name_label')}</label>
                    <input
                        id="edit-supplement-name"
                        type="text"
                        value={supplement}
                        onChange={(e) => setSupplement(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={t('supplements_add_name_placeholder')}
                        required
                        disabled={isGenerated}
                    />
                </div>
                
                {!isGenerated && (
                    <div>
                        <label htmlFor="edit-supplement-dosage" className="block text-sm font-medium text-text-secondary">{t('supplements_add_dosage_label')}</label>
                        <input
                            id="edit-supplement-dosage"
                            type="text"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                            placeholder={t('supplements_add_dosage_placeholder')}
                        />
                    </div>
                )}

                <div>
                    <label htmlFor="edit-supplement-time" className="block text-sm font-medium text-text-secondary">{t('supplements_add_time_label')}</label>
                     <select
                        id="edit-supplement-time"
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
                    <label htmlFor="edit-supplement-stock" className="block text-sm font-medium text-text-secondary">{t('supplements_add_stock_label')}</label>
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
                    <label htmlFor="edit-supplement-notes" className="block text-sm font-medium text-text-secondary">{t('supplements_add_notes_label')}</label>
                    <textarea
                        id="edit-supplement-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_notes_placeholder')}
                        rows={3}
                    />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className="bg-secondary px-4 py-2 rounded-lg">{t('common_cancel')}</button>
                    <button type="submit" className="bg-primary px-4 py-2 rounded-lg">{t('supplements_edit_save')}</button>
                </div>
            </form>
        </Modal>
    );
};

export default EditSupplementModal;
