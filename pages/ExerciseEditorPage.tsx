
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { EditorContext } from '../contexts/EditorContext';
import { Exercise, MuscleGroup } from '../types';
import { Icon } from '../components/common/Icon';
import ConfirmModal from '../components/modals/ConfirmModal';
import TagCloud from '../components/common/TagCloud';
import { useI18n } from '../hooks/useI18n';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS, MUSCLE_GROUP_OPTIONS } from '../constants/filters';
import { getBodyPartTKey, getCategoryTKey, getMuscleTKey } from '../utils/i18nUtils';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { MultiSelectDropdown } from '../components/common/MultiSelectDropdown';

const ExerciseEditorPage: React.FC = () => {
    const { rawExercises, endExerciseEdit } = useContext(AppContext);
    const { editingExercise } = useContext(EditorContext);
    const { t, t_ins } = useI18n();

    if (!editingExercise) {
        return null;
    }

    const [exercise, setExercise] = useState<Exercise>(() => JSON.parse(JSON.stringify(editingExercise)));
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);

    const isNew = useMemo(() => !rawExercises.some(e => e.id === editingExercise.id), [rawExercises, editingExercise.id]);
    const isStockEdit = useMemo(() => editingExercise.id.startsWith('ex-'), [editingExercise.id]);

    const stockInstructions = useMemo(() => {
        if (!isStockEdit) return '';
        const instructionKey = editingExercise.id.replace(/-/g, '_') + '_ins';
        const instructions = t_ins(instructionKey);
        if (instructions && instructions.steps.length > 0 && instructions.title !== instructionKey) {
            return instructions.steps.join('\n');
        }
        return '';
    }, [isStockEdit, editingExercise.id, t_ins]);

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

    return (
        <div className="space-y-6 pb-10 animate-fadeIn">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-md z-30 -mx-4 px-4 py-3 border-b border-white/10 flex items-center justify-between shadow-sm">
                <button 
                    onClick={handleBack} 
                    className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors rounded-full hover:bg-white/5"
                    aria-label="Back"
                >
                    <Icon name="arrow-down" className="rotate-90 w-6 h-6"/>
                </button>
                <h1 className="text-lg font-bold text-white tracking-wide">
                    {isNew ? t('exercise_editor_add_title') : t('exercise_editor_edit_title')}
                </h1>
                <button 
                    onClick={handleSave} 
                    className="bg-primary text-white font-bold py-1.5 px-4 rounded-full shadow-lg shadow-primary/20 hover:bg-primary-content transition-all text-sm active:scale-95"
                >
                    {t('common_save')}
                </button>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
                {/* Basic Info Card */}
                <div className="bg-surface p-5 rounded-2xl shadow-sm border border-white/5 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pl-1">
                            {t('exercise_editor_name_label')}
                        </label>
                        <input 
                            type="text"
                            value={exercise.name}
                            onChange={(e) => setExercise({ ...exercise, name: e.target.value })}
                            className="w-full bg-background border border-white/10 rounded-xl p-4 text-lg font-semibold text-white placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
                            placeholder="e.g. Incline Bench Press"
                            autoFocus={isNew}
                        />
                    </div>

                    <div className="flex items-center justify-between p-1">
                        <div>
                            <span className="block text-sm font-bold text-text-primary">{t('exercise_editor_is_timed_label')}</span>
                            <span className="block text-xs text-text-secondary">{t('exercise_editor_is_timed_desc')}</span>
                        </div>
                        <ToggleSwitch 
                            checked={!!exercise.isTimed} 
                            onChange={(checked) => setExercise({ ...exercise, isTimed: checked })} 
                        />
                    </div>
                </div>

                {/* Categorization Card */}
                <div className="bg-surface p-5 rounded-2xl shadow-sm border border-white/5 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">
                            {t('filter_body_part')}
                        </label>
                        <TagCloud 
                            options={bodyPartTagOptions} 
                            selected={exercise.bodyPart} 
                            onSelect={(bp) => setExercise({ ...exercise, bodyPart: bp })} 
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3 pl-1">
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                                {t('filter_category')}
                            </label>
                            {isStockEdit && (
                                <span className="text-[10px] text-text-secondary/50 italic">{t('exercise_editor_category_locked')}</span>
                            )}
                        </div>
                        <TagCloud 
                            options={categoryTagOptions} 
                            selected={exercise.category} 
                            onSelect={(cat) => setExercise({ ...exercise, category: cat })} 
                            disabled={isStockEdit}
                        />
                    </div>
                </div>

                {/* Muscles Card */}
                <div className="bg-surface p-5 rounded-2xl shadow-sm border border-white/5 space-y-6">
                    <MultiSelectDropdown 
                        label={t('exercise_primary_targets')}
                        options={muscleOptions}
                        selected={exercise.primaryMuscles || []}
                        onChange={(muscles) => setExercise({ ...exercise, primaryMuscles: muscles as MuscleGroup[] })}
                        placeholder="Select primary movers..."
                    />

                    <MultiSelectDropdown 
                        label={t('exercise_secondary_targets')}
                        options={muscleOptions}
                        selected={exercise.secondaryMuscles || []}
                        onChange={(muscles) => setExercise({ ...exercise, secondaryMuscles: muscles as MuscleGroup[] })}
                        placeholder="Select secondary movers..."
                    />
                </div>

                {/* Notes/Instructions Card */}
                <div className="bg-surface p-5 rounded-2xl shadow-sm border border-white/5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pl-1">
                            {t('exercise_editor_notes_label')}
                        </label>
                        <textarea
                            value={exercise.notes}
                            onChange={(e) => setExercise({ ...exercise, notes: e.target.value })}
                            className="w-full bg-background border border-white/10 rounded-xl p-4 text-sm text-text-primary placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner min-h-[120px] resize-none"
                            placeholder={t('exercise_editor_notes_placeholder')}
                        />
                    </div>

                    {isStockEdit && stockInstructions && (
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pl-1">
                                {t('description_instructions')}
                            </label>
                            <div className="bg-background/50 border border-white/5 rounded-xl p-4 text-sm text-text-secondary/80 whitespace-pre-wrap italic">
                                {stockInstructions}
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
        </div>
    );
};

export default ExerciseEditorPage;
