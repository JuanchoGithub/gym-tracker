
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { SupplementPlanItem } from '../../types';

interface EditSupplementModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: SupplementPlanItem;
    onSave: (updates: Partial<SupplementPlanItem>) => void;
}

const EditSupplementModal: React.FC<EditSupplementModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const { t } = useI18n();
    const [supplement, setSupplement] = useState('');
    const [dosage, setDosage] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [stock, setStock] = useState('');

    useEffect(() => {
        if (isOpen && item) {
            setSupplement(item.supplement);
            setDosage(item.dosage);
            setTime(item.time);
            setNotes(item.notes);
            setStock(item.stock !== undefined ? item.stock.toString() : '');
        }
    }, [isOpen, item]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplement.trim()) {
            alert(t('supplements_add_name_required'));
            return;
        }
        
        const stockVal = stock ? parseInt(stock, 10) : undefined;

        onSave({ supplement, dosage, time, notes, stock: stockVal });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('supplements_edit_modal_title')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="edit-supplement-name" className="block text-sm font-medium text-text-secondary">{t('supplements_add_name_label')}</label>
                    <input
                        id="edit-supplement-name"
                        type="text"
                        value={supplement}
                        onChange={(e) => setSupplement(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_name_placeholder')}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="edit-supplement-dosage" className="block text-sm font-medium text-text-secondary">{t('supplements_add_dosage_label')}</label>
                    <input
                        id="edit-supplement-dosage"
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_dosage_placeholder')}
                    />
                </div>
                <div>
                    <label htmlFor="edit-supplement-stock" className="block text-sm font-medium text-text-secondary">{t('supplements_add_stock_label')}</label>
                    <input
                        id="edit-supplement-stock"
                        type="number"
                        inputMode="numeric"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_stock_placeholder')}
                    />
                </div>
                <div>
                    <label htmlFor="edit-supplement-time" className="block text-sm font-medium text-text-secondary">{t('supplements_add_time_label')}</label>
                    <input
                        id="edit-supplement-time"
                        type="text"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('supplements_add_time_placeholder')}
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
