import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Exercise, BodyPart, ExerciseCategory } from '../types';
import { Icon } from '../components/common/Icon';
import ConfirmModal from '../components/modals/ConfirmModal';
import TagCloud from '../components/common/TagCloud';
import { useI18n } from '../hooks/useI18n';

const bodyPartOptions: ReadonlyArray<BodyPart> = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Calves', 'Forearms', 'Cardio'];
const categoryOptions: ReadonlyArray<ExerciseCategory> = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Assisted Bodyweight', 'Reps Only', 'Cardio', 'Duration'];

const ExerciseEditorPage: React.FC = () => {
    const { exercises, editingExercise, endExerciseEdit } = useContext(AppContext);
    const { t_ins } = useI18n();

    if (!editingExercise) {
        endExerciseEdit();
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
        return 'No instructions available for this exercise.';
    }, [isStockEdit, editingExercise.id, t_ins]);


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
            alert("Exercise name cannot be empty.");
            return;
        }
        endExerciseEdit(exercise);
    };
    
    const handleFieldChange = (field: keyof Exercise, value: string) => {
        setExercise(prev => ({...prev, [field]: value }));
    }

    return (
        <div className="space-y-6">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-4 px-4 py-2 border-b border-secondary/20">
                <div className="container mx-auto flex items-center justify-between">
                    <button onClick={handleBack} className="p-2 text-text-secondary hover:text-primary">
                        <Icon name="arrow-down" className="rotate-90"/>
                    </button>
                    <h1 className="text-xl font-bold text-center">
                        {isNew ? 'Add Exercise' : 'Edit Exercise'}
                    </h1>
                    <button onClick={handleSave} className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-400 text-sm">
                        Save
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="exercise-name" className="text-sm font-medium text-text-secondary">Name</label>
                    <input 
                        id="exercise-name"
                        type="text"
                        value={exercise.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                    />
                </div>
                 <div>
                    <label className="text-sm font-medium text-text-secondary">Body Part</label>
                    <div className="mt-2">
                        <TagCloud
                            options={bodyPartOptions}
                            selected={exercise.bodyPart}
                            onSelect={(val) => handleFieldChange('bodyPart', val)}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-text-secondary">
                        Category {!isNew && <span className="text-xs font-normal text-text-secondary/70">(cannot be changed)</span>}
                    </label>
                    <div className="mt-2">
                        <TagCloud
                            options={categoryOptions}
                            selected={exercise.category}
                            onSelect={(val) => handleFieldChange('category', val)}
                            disabled={!isNew}
                        />
                    </div>
                </div>
                 <div>
                    <label htmlFor="exercise-notes" className="text-sm font-medium text-text-secondary">Description / Notes</label>
                    <textarea
                        id="exercise-notes"
                        value={isStockEdit ? stockInstructions : (exercise.notes || '')}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        disabled={isStockEdit}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1 disabled:bg-slate-900 disabled:text-text-secondary"
                        rows={isStockEdit ? 16 : 8}
                        placeholder={isStockEdit ? '' : "Add instructions or personal notes..."}
                    />
                </div>
            </div>
            
            <ConfirmModal
                isOpen={isConfirmingBack}
                onClose={() => setIsConfirmingBack(false)}
                onConfirm={handleConfirmDiscard}
                title="Discard Changes?"
                message="You have unsaved changes. Are you sure you want to discard them?"
                confirmText="Discard"
                cancelText="Cancel"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
};

export default ExerciseEditorPage;