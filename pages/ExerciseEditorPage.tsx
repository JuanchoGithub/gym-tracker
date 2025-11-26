


import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Exercise, MuscleGroup } from '../types';
import { Icon } from '../components/common/Icon';
import ConfirmModal from '../components/modals/ConfirmModal';
import TagCloud from '../components/common/TagCloud';
import { useI18n } from '../hooks/useI18n';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS, MUSCLE_GROUP_OPTIONS } from '../constants/filters';
import { getBodyPartTKey, getCategoryTKey, getMuscleTKey } from '../utils/i18nUtils';
import Modal from '../components/common/Modal';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { MultiSelectDropdown } from '../components/common/MultiSelectDropdown';

const ExerciseEditorPage: React.FC = () => {
    const { exercises, editingExercise, endExerciseEdit } = useContext(AppContext);
    const { t, t_ins } = useI18n();

    if (!editingExercise) {
        return null;
    }

    const [exercise, setExercise] = useState<Exercise>(() => JSON.parse(JSON.stringify(editingExercise)));
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);

    const isNew = useMemo(() => !exercises.some(e => e.id === editingExercise.id), [exercises, editingExercise.id]);
    const isStockEdit = useMemo(() => editingExercise.id.startsWith('ex-'), [editingExercise.id]);

    const stockInstructions = useMemo(() => {
        if (!isStockEdit) return '';
        const instructionKey = editingExercise.id.replace('-', '_') + '_ins';
        const instructions = t_ins(instructionKey);
        if (instructions && instructions.steps.length > 0 && instructions.title !== instructionKey) {
            return instructions.steps.join('\n');
        }
        return t('exercise_editor_no_instructions');
    }, [isStockEdit, editingExercise.id, t_ins, t]);

    const bodyPartTagOptions = useMemo(() => BODY_PART_OPTIONS.map(bp => ({
        value: bp,
        label: t(getBodyPartTKey(bp))
    })), [t]);
    
    const categoryTagOptions = useMemo(() => CATEGORY_OPTIONS.map(cat => ({
        value: cat,
        label: t(getCategoryTKey(cat))
    })), [t]);

    const muscleOptions = useMemo(() => MUSCLE_GROUP_OPTIONS.map(m => ({
        value: m,
        label: t(getMuscleTKey(m))
    })).sort((a, b) => a.label.localeCompare(b.label)), [t]);


    const handleBack = () => {
        const hasChanged = JSON.stringify(exercise) !== JSON.stringify(editingExercise);
        if (hasChanged) {
            setIsConfirmingBack(true);
        } else {
            endExerciseEdit();
        }
    };

    const handleConfirmDiscard = () => {
        endExerciseEdit();
        setIsConfirmingBack(false);
    };

    const handleSave = () => {
        if (!exercise.name.trim()) {
            alert(t('exercise_editor_name_empty_alert'));
            return;
        }
        endExerciseEdit(exercise);
    };
    
    const handleFieldChange = (field: keyof Exercise, value: any) => {
        setExercise(prev => ({...prev, [field]: value }));
    }

    return (
        <>
            <Modal
                isOpen={!!editingExercise}
                onClose={handleBack}
                title={undefined}
                contentClassName="bg-[#0f172a] rounded-2xl shadow-2xl w-[calc(100%-1rem)] max-w-2xl m-auto flex flex-col h-[85vh] max-h-[800px] border border-white/10 overflow-hidden"
            >
                {/* Sticky Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0 bg-[#0f172a]">
                    <button onClick={handleBack} className="p-2 -ml-2 rounded-full text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
                        <Icon name="x" className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-center text-white">
                        {isNew ? t('exercise_editor_add_title') : t('exercise_editor_edit_title')}
                    </h1>
                    <button onClick={handleSave} className="bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-primary-content transition-colors text-sm">
                        {t('common_save')}
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-5 sm:p-8 space-y-8 flex-grow overflow-y-auto" style={{ overscrollBehaviorY: 'contain' }}>
                    <div className="space-y-6">
                        {/* Name Input */}
                        <div>
                            <label htmlFor="exercise-name" className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">{t('exercise_editor_name_label')}</label>
                            <input 
                                id="exercise-name"
                                type="text"
                                value={exercise.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-xl p-4 text-lg font-medium text-white placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
                                placeholder="e.g. Bench Press"
                            />
                        </div>
                        
                        {/* Body Part */}
                        <div>
                            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">{t('filter_body_part')}</label>
                            <div className="p-4 bg-surface/40 rounded-xl border border-white/5">
                                <TagCloud
                                    options={bodyPartTagOptions}
                                    selected={exercise.bodyPart}
                                    onSelect={(val) => handleFieldChange('bodyPart', val)}
                                />
                            </div>
                        </div>

                         {/* Specific Muscles */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MultiSelectDropdown
                                label={t('exercise_primary_targets')}
                                options={muscleOptions}
                                selected={exercise.primaryMuscles || []}
                                onChange={(val) => handleFieldChange('primaryMuscles', val)}
                                placeholder="Select primary muscles..."
                            />
                            <MultiSelectDropdown
                                label={t('exercise_secondary_targets')}
                                options={muscleOptions}
                                selected={exercise.secondaryMuscles || []}
                                onChange={(val) => handleFieldChange('secondaryMuscles', val)}
                                placeholder="Select secondary muscles..."
                            />
                        </div>
                        
                        {/* Category */}
                        <div>
                            <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">
                                {t('filter_category')} {!isNew && <span className="text-[10px] font-normal text-text-secondary/70 normal-case ml-2">{t('exercise_editor_category_locked')}</span>}
                            </label>
                            <div className="p-4 bg-surface/40 rounded-xl border border-white/5">
                                <TagCloud
                                    options={categoryTagOptions}
                                    selected={exercise.category}
                                    onSelect={(val) => handleFieldChange('category', val)}
                                    disabled={!isNew}
                                />
                            </div>
                        </div>

                        {/* Timed Toggle - High Visibility */}
                        <div className="bg-surface border border-white/10 p-4 rounded-xl shadow-sm flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <label className="text-base font-bold text-text-primary">{t('exercise_editor_is_timed_label')}</label>
                                <p className="text-xs text-text-secondary leading-relaxed max-w-[250px]">{t('exercise_editor_is_timed_desc')}</p>
                            </div>
                            <div className="pl-4">
                                <ToggleSwitch
                                    checked={!!exercise.isTimed}
                                    onChange={(checked) => handleFieldChange('isTimed', checked)}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="exercise-notes" className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">{t('exercise_editor_notes_label')}</label>
                            <textarea
                                id="exercise-notes"
                                value={isStockEdit ? stockInstructions : (exercise.notes || '')}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                disabled={isStockEdit}
                                className="w-full bg-surface/40 border border-white/10 rounded-xl p-4 text-white placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm disabled:bg-surface/20 disabled:text-text-secondary min-h-[120px]"
                                rows={isStockEdit ? 10 : 6}
                                placeholder={isStockEdit ? '' : t('exercise_editor_notes_placeholder')}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
            
            <ConfirmModal
                isOpen={isConfirmingBack}
                onClose={() => setIsConfirmingBack(false)}
                onConfirm={handleConfirmDiscard}
                title={t('confirm_discard_title')}
                message={t('confirm_discard_message')}
                confirmText={t('common_discard')}
                cancelText={t('common_cancel')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </>
    );
};

export default ExerciseEditorPage;