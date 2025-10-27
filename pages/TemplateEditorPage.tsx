import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Routine, WorkoutExercise, PerformedSet } from '../types';
import { Icon } from '../components/common/Icon';
import AddExercisesModal from '../components/modals/AddExercisesModal';
import TemplateExerciseCard from '../components/template/TemplateExerciseCard';
import ConfirmModal from '../components/modals/ConfirmModal';

const TemplateEditorPage: React.FC = () => {
    const { editingTemplate, endTemplateEdit, getExerciseById, defaultRestTimes } = useContext(AppContext);
    const [template, setTemplate] = useState<Routine>(() => JSON.parse(JSON.stringify(editingTemplate)));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);

    const handleBack = () => {
        if (JSON.stringify(template) !== JSON.stringify(editingTemplate)) {
            setIsConfirmingBack(true);
        } else {
            endTemplateEdit();
        }
    };
    
    const handleConfirmDiscard = () => {
        endTemplateEdit();
        setIsConfirmingBack(false); // This will be unmounted, but good practice
    };

    const handleSave = () => {
        if (!template.name.trim()) {
            alert("Template name cannot be empty.");
            return;
        }
        endTemplateEdit(template);
    };

    const handleAddExercises = (exerciseIds: string[]) => {
        const newExercises: WorkoutExercise[] = exerciseIds.map(exId => ({
            id: `we-${Date.now()}-${Math.random()}`,
            exerciseId: exId,
            sets: Array.from({ length: 1 }, () => ({
                id: `set-${Date.now()}-${Math.random()}`,
                reps: 10,
                weight: 0,
                type: 'normal',
            } as PerformedSet)),
            restTime: { ...defaultRestTimes },
        }));

        setTemplate(prev => ({ ...prev, exercises: [...prev.exercises, ...newExercises] }));
    };

    const handleUpdateExercise = (updatedExercise: WorkoutExercise) => {
        setTemplate(prev => ({
            ...prev,
            exercises: prev.exercises.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex)
        }));
    };
    
    const handleRemoveExercise = (exerciseId: string) => {
        setTemplate(prev => ({
            ...prev,
            exercises: prev.exercises.filter(ex => ex.id !== exerciseId)
        }));
    };

    if (!template) return null;

    return (
        <div className="space-y-4">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-4 px-4 py-2 border-b border-secondary/20">
                <div className="container mx-auto flex items-center justify-between">
                    <button onClick={handleBack} className="p-2 text-text-secondary hover:text-primary">
                        <Icon name="arrow-down" className="rotate-90"/>
                    </button>
                    <h1 className="text-xl font-bold text-center">
                        {editingTemplate?.id.startsWith('custom-') ? 'Edit Template' : 'Create Template'}
                    </h1>
                    <button onClick={handleSave} className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-400 text-sm">
                        Save
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-text-secondary">Template Name</label>
                    <input 
                        type="text"
                        value={template.name}
                        onChange={(e) => setTemplate(t => ({ ...t, name: e.target.value }))}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder="e.g., Push Day"
                    />
                </div>
                 <div>
                    <label className="text-sm font-medium text-text-secondary">Description</label>
                    <textarea
                        value={template.description}
                        onChange={(e) => setTemplate(t => ({ ...t, description: e.target.value }))}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                        rows={3}
                        placeholder="Add some notes about this template..."
                    />
                </div>
            </div>
            
            <h2 className="text-lg font-semibold border-b border-secondary/20 pb-2">Exercises</h2>
            <div className="space-y-4">
                {template.exercises.map(we => {
                    const exerciseInfo = getExerciseById(we.exerciseId);
                    if (!exerciseInfo) return null;
                    return (
                        <TemplateExerciseCard 
                            key={we.id}
                            workoutExercise={we}
                            exerciseInfo={exerciseInfo}
                            onUpdate={handleUpdateExercise}
                            onRemove={handleRemoveExercise}
                        />
                    );
                })}

                {template.exercises.length === 0 && (
                    <div className="text-center py-8 bg-surface rounded-lg">
                        <p className="text-text-secondary">This template is empty.</p>
                    </div>
                )}
            </div>
            
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
            >
                <Icon name="plus" className="w-5 h-5" />
                <span>Add Exercises</span>
            </button>

            <AddExercisesModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddExercises}
            />
            
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

export default TemplateEditorPage;