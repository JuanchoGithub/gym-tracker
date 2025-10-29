import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Routine, WorkoutExercise, PerformedSet } from '../types';
import { Icon } from '../components/common/Icon';
import AddExercisesModal from '../components/modals/AddExercisesModal';
import TemplateExerciseCard from '../components/template/TemplateExerciseCard';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useI18n } from '../hooks/useI18n';

const TemplateEditorPage: React.FC = () => {
    const { editingTemplate, endTemplateEdit, getExerciseById, defaultRestTimes } = useContext(AppContext);
    const { t } = useI18n();
    const [template, setTemplate] = useState<Routine>(() => JSON.parse(JSON.stringify(editingTemplate)));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

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
            alert(t('template_editor_name_empty_alert'));
            return;
        }
        endTemplateEdit(template);
    };

    const handleAddExercises = (exerciseIds: string[]) => {
        let newExercises: WorkoutExercise[];
        if (template.routineType === 'hiit') {
            newExercises = exerciseIds.map(exerciseId => ({
                id: `we-${Date.now()}-${Math.random()}`,
                exerciseId,
                sets: [{ id: `set-${Date.now()}-${Math.random()}`, reps: 1, weight: 0, type: 'normal', isComplete: false } as PerformedSet],
                restTime: { normal: 0, warmup: 0, drop: 0, timed: 0 },
            }));
        } else {
            newExercises = exerciseIds.map(exId => ({
                id: `we-${Date.now()}-${Math.random()}`,
                exerciseId: exId,
                sets: Array.from({ length: 1 }, () => ({
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps: 10,
                    weight: 0,
                    type: 'normal',
                    isRepsInherited: false,
                    isWeightInherited: false,
                    isTimeInherited: false,
                } as PerformedSet)),
                restTime: { ...defaultRestTimes },
            }));
        }

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

    const handleHiitConfigChange = (field: keyof NonNullable<Routine['hiitConfig']>, value: string) => {
        const numValue = parseInt(value, 10) || 0;
        setTemplate(prev => ({
            ...prev,
            hiitConfig: {
                ...prev.hiitConfig,
                workTime: prev.hiitConfig?.workTime || 30,
                restTime: prev.hiitConfig?.restTime || 15,
                [field]: numValue
            }
        }));
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
        setDraggedOverIndex(position);
    };

    const handleDrop = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            setDraggedOverIndex(null);
            dragItem.current = null;
            return;
        }
        
        const newExercises = [...template.exercises];
        const dragItemContent = newExercises.splice(dragItem.current, 1)[0];
        newExercises.splice(dragOverItem.current, 0, dragItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedOverIndex(null);
        
        setTemplate(prev => ({...prev, exercises: newExercises}));
    };


    if (!template) return null;

    return (
        <div className="space-y-4">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
                <div className="container mx-auto flex items-center justify-between">
                    <button onClick={handleBack} className="p-2 text-text-secondary hover:text-primary">
                        <Icon name="arrow-down" className="rotate-90"/>
                    </button>
                    <h1 className="text-xl font-bold text-center">
                        {editingTemplate?.id.startsWith('custom-') ? t('template_editor_edit_title') : t('template_editor_create_title')}
                    </h1>
                    <button onClick={handleSave} className="bg-success text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-green-400 text-sm">
                        {t('common_save')}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('template_editor_name_label')}</label>
                    <input 
                        type="text"
                        value={template.name}
                        onChange={(e) => setTemplate(t => ({ ...t, name: e.target.value }))}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('template_editor_name_placeholder')}
                    />
                </div>
                 <div>
                    <label className="text-sm font-medium text-text-secondary">{t('template_editor_description_label')}</label>
                    <textarea
                        value={template.description}
                        onChange={(e) => setTemplate(t => ({ ...t, description: e.target.value }))}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                        rows={3}
                        placeholder={t('template_editor_description_placeholder')}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('template_editor_routine_type')}</label>
                    <div className="flex rounded-lg bg-surface p-1 mt-1">
                        <button 
                        onClick={() => setTemplate(t => ({ ...t, routineType: 'strength' }))}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${template.routineType !== 'hiit' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                        >{t('template_editor_type_strength')}</button>
                        <button
                        onClick={() => setTemplate(t => ({ ...t, routineType: 'hiit', hiitConfig: t.hiitConfig || { workTime: 30, restTime: 15, prepareTime: 10 } }))}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${template.routineType === 'hiit' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                        >{t('template_editor_type_hiit')}</button>
                    </div>
                </div>
                {template.routineType === 'hiit' && (
                    <div className="bg-surface p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">{t('template_editor_hiit_config')}</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('template_editor_work_time')}</label>
                                <input type="number" value={template.hiitConfig?.workTime || 0} onChange={e => handleHiitConfigChange('workTime', e.target.value)} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-center"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('template_editor_rest_time')}</label>
                                <input type="number" value={template.hiitConfig?.restTime || 0} onChange={e => handleHiitConfigChange('restTime', e.target.value)} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-center"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('template_editor_prepare_time')}</label>
                                <input type="number" value={template.hiitConfig?.prepareTime || 0} onChange={e => handleHiitConfigChange('prepareTime', e.target.value)} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-center"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <h2 className="text-lg font-semibold border-b border-secondary/20 pb-2">{t('template_editor_exercises_title')}</h2>
            {template.routineType === 'hiit' ? (
                <div className="space-y-2" onDragOver={e => e.preventDefault()}>
                    {template.exercises.map((we, index) => {
                        const exerciseInfo = getExerciseById(we.exerciseId);
                        if (!exerciseInfo) return null;
                        return (
                            <div
                                key={we.id}
                                className={`bg-surface p-3 rounded-lg flex items-center gap-3 relative transition-opacity ${dragItem.current === index ? 'opacity-50' : 'opacity-100'}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                // FIX: The 'title' prop is not valid on the Icon component. Moved it here to the parent draggable div to resolve the TypeScript error and apply the tooltip to the whole item.
                                title={t('template_editor_drag_to_reorder')}
                            >
                                <Icon name="ellipsis" className="w-6 h-6 rotate-90 cursor-grab text-text-secondary" />
                                <span className="font-semibold flex-grow">{exerciseInfo.name}</span>
                                <button onClick={() => handleRemoveExercise(we.id)} className="p-2 text-red-400 hover:text-red-500">
                                    <Icon name="trash" />
                                </button>
                                {draggedOverIndex === index && dragItem.current !== index && <div className="absolute -top-1 left-0 w-full h-1 bg-primary rounded-full"></div>}
                            </div>
                        );
                    })}
                </div>
            ) : (
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
                </div>
            )}


            {(template.exercises.length === 0) && (
                <div className="text-center py-8 bg-surface rounded-lg">
                    <p className="text-text-secondary">{t('template_editor_empty')}</p>
                </div>
            )}
            
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
            >
                <Icon name="plus" className="w-5 h-5" />
                <span>{t('template_editor_add_exercises')}</span>
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
                title={t('confirm_discard_title')}
                message={t('confirm_discard_message')}
                confirmText={t('common_discard')}
                cancelText={t('common_cancel')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
};

export default TemplateEditorPage;