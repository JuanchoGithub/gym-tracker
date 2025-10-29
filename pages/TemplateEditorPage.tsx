import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Routine, WorkoutExercise } from '../types';
import { Icon } from '../components/common/Icon';
import TemplateExerciseCard from '../components/template/TemplateExerciseCard';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useI18n } from '../hooks/useI18n';

const TemplateEditorPage: React.FC = () => {
    const { editingTemplate, updateEditingTemplate, endTemplateEdit, getExerciseById, startAddExercisesToTemplate } = useContext(AppContext);
    const { t } = useI18n();
    const [originalTemplate] = useState<Routine | null>(() => JSON.parse(JSON.stringify(editingTemplate)));
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const handleBack = () => {
        if (JSON.stringify(editingTemplate) !== JSON.stringify(originalTemplate)) {
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
        if (!editingTemplate?.name.trim()) {
            alert(t('template_editor_name_empty_alert'));
            return;
        }
        endTemplateEdit(editingTemplate);
    };

    const handleUpdateExercise = (updatedExercise: WorkoutExercise) => {
        if (!editingTemplate) return;
        updateEditingTemplate({
            ...editingTemplate,
            exercises: editingTemplate.exercises.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex)
        });
    };
    
    const handleRemoveExercise = (exerciseId: string) => {
        if (!editingTemplate) return;
        updateEditingTemplate({
            ...editingTemplate,
            exercises: editingTemplate.exercises.filter(ex => ex.id !== exerciseId)
        });
    };

    const handleHiitConfigChange = (field: keyof NonNullable<Routine['hiitConfig']>, value: string) => {
        if (!editingTemplate) return;
        const numValue = parseInt(value, 10) || 0;
        updateEditingTemplate({
            ...editingTemplate,
            hiitConfig: {
                ...editingTemplate.hiitConfig,
                workTime: editingTemplate.hiitConfig?.workTime || 30,
                restTime: editingTemplate.hiitConfig?.restTime || 15,
                [field]: numValue
            }
        });
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
        setDraggedOverIndex(position);
    };

    const handleDrop = () => {
        if (!editingTemplate || dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            setDraggedOverIndex(null);
            dragItem.current = null;
            return;
        }
        
        const newExercises = [...editingTemplate.exercises];
        const dragItemContent = newExercises.splice(dragItem.current, 1)[0];
        newExercises.splice(dragOverItem.current, 0, dragItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedOverIndex(null);
        
        updateEditingTemplate({...editingTemplate, exercises: newExercises});
    };


    if (!editingTemplate) return null;

    return (
        <div className="space-y-4">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
                <div className="container mx-auto flex items-center justify-between">
                    <button onClick={handleBack} className="p-2 text-text-secondary hover:text-primary">
                        <Icon name="arrow-down" className="rotate-90"/>
                    </button>
                    <h1 className="text-xl font-bold text-center">
                        {originalTemplate?.id === editingTemplate.id ? t('template_editor_edit_title') : t('template_editor_create_title')}
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
                        value={editingTemplate.name}
                        onChange={(e) => updateEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                        placeholder={t('template_editor_name_placeholder')}
                    />
                </div>
                 <div>
                    <label className="text-sm font-medium text-text-secondary">{t('template_editor_description_label')}</label>
                    <textarea
                        value={editingTemplate.description}
                        onChange={(e) => updateEditingTemplate({ ...editingTemplate, description: e.target.value })}
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1"
                        rows={3}
                        placeholder={t('template_editor_description_placeholder')}
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-text-secondary">{t('template_editor_routine_type')}</label>
                    <div className="flex rounded-lg bg-surface p-1 mt-1">
                        <button 
                        onClick={() => updateEditingTemplate({ ...editingTemplate, routineType: 'strength' })}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${editingTemplate.routineType !== 'hiit' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                        >{t('template_editor_type_strength')}</button>
                        <button
                        onClick={() => updateEditingTemplate({ ...editingTemplate, routineType: 'hiit', hiitConfig: editingTemplate.hiitConfig || { workTime: 30, restTime: 15, prepareTime: 10 } })}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${editingTemplate.routineType === 'hiit' ? 'bg-primary text-white' : 'text-text-secondary'}`}
                        >{t('template_editor_type_hiit')}</button>
                    </div>
                </div>
                {editingTemplate.routineType === 'hiit' && (
                    <div className="bg-surface p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">{t('template_editor_hiit_config')}</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('template_editor_work_time')}</label>
                                <input type="number" value={editingTemplate.hiitConfig?.workTime || 0} onChange={e => handleHiitConfigChange('workTime', e.target.value)} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-center"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('template_editor_rest_time')}</label>
                                <input type="number" value={editingTemplate.hiitConfig?.restTime || 0} onChange={e => handleHiitConfigChange('restTime', e.target.value)} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-center"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">{t('template_editor_prepare_time')}</label>
                                <input type="number" value={editingTemplate.hiitConfig?.prepareTime || 0} onChange={e => handleHiitConfigChange('prepareTime', e.target.value)} className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1 text-center"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <h2 className="text-lg font-semibold border-b border-secondary/20 pb-2">{t('template_editor_exercises_title')}</h2>
            {editingTemplate.routineType === 'hiit' ? (
                <div className="space-y-2" onDragOver={e => e.preventDefault()}>
                    {editingTemplate.exercises.map((we, index) => {
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
                    {editingTemplate.exercises.map(we => {
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


            {(editingTemplate.exercises.length === 0) && (
                <div className="text-center py-8 bg-surface rounded-lg">
                    <p className="text-text-secondary">{t('template_editor_empty')}</p>
                </div>
            )}
            
            <button
                onClick={startAddExercisesToTemplate}
                className="w-full flex items-center justify-center space-x-2 bg-secondary/50 text-text-primary font-medium py-3 rounded-lg hover:bg-secondary transition-colors"
            >
                <Icon name="plus" className="w-5 h-5" />
                <span>{t('template_editor_add_exercises')}</span>
            </button>
            
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