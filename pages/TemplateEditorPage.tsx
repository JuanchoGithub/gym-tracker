
import React, { useContext, useState, useRef, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Routine, WorkoutExercise, SupersetDefinition } from '../types';
import { Icon } from '../components/common/Icon';
import TemplateExerciseCard from '../components/template/TemplateExerciseCard';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useI18n } from '../hooks/useI18n';
import { groupExercises } from '../utils/workoutUtils';
import SupersetCard from '../components/workout/SupersetCard';

const TemplateEditorPage: React.FC = () => {
    const { editingTemplate, updateEditingTemplate, endTemplateEdit, getExerciseById, startAddExercisesToTemplate } = useContext(AppContext);
    const { t } = useI18n();
    const [originalTemplate] = useState<Routine | null>(() => JSON.parse(JSON.stringify(editingTemplate)));
    const [isConfirmingBack, setIsConfirmingBack] = useState(false);
    
    const dragInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
    const dragOverInfo = useRef<{ type: 'item' | 'superset', indices: number[] } | null>(null);
    const [draggedOverIndices, setDraggedOverIndices] = useState<number[] | null>(null);

    const availableSupersets = useMemo(() => {
        if (!editingTemplate || !editingTemplate.supersets) return [];
        return Object.values(editingTemplate.supersets).map((superset: SupersetDefinition) => ({
            id: superset.id,
            name: superset.name,
            exercises: editingTemplate.exercises
                .filter(ex => ex.supersetId === superset.id)
                .map(ex => getExerciseById(ex.exerciseId)?.name || 'Unknown')
        }));
    }, [editingTemplate, getExerciseById]);

    const handleBack = () => {
        if (JSON.stringify(editingTemplate) !== JSON.stringify(originalTemplate)) {
            setIsConfirmingBack(true);
        } else {
            endTemplateEdit();
        }
    };
    
    const handleConfirmDiscard = () => {
        endTemplateEdit();
        setIsConfirmingBack(false);
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
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => {
        e.stopPropagation();
        dragInfo.current = { type, indices };
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, type: 'item' | 'superset', indices: number[]) => {
        e.stopPropagation();
        dragOverInfo.current = { type, indices };
        setDraggedOverIndices(indices);
    };

    const handleMoveExercise = (fromIndex: number, toIndex: number) => {
        if (!editingTemplate || toIndex < 0 || toIndex >= editingTemplate.exercises.length) {
            return;
        }
        const newExercises = [...editingTemplate.exercises];
        const [movedItem] = newExercises.splice(fromIndex, 1);
        newExercises.splice(toIndex, 0, movedItem);
        updateEditingTemplate({ ...editingTemplate, exercises: newExercises });
    };

    const handleDrop = () => {
        if (!editingTemplate || !dragInfo.current || !dragOverInfo.current) return;
        
        const source = dragInfo.current;
        const target = dragOverInfo.current;
        
        if (source.indices[0] === target.indices[0]) {
            setDraggedOverIndices(null);
            dragInfo.current = null;
            dragOverInfo.current = null;
            return;
        }

        const newExercises = [...editingTemplate.exercises];
        const sourceIndices = source.indices.sort((a, b) => a - b);
        const removedItems = newExercises.splice(sourceIndices[0], sourceIndices.length);
        
        let insertIndex = target.indices[0];
        if (insertIndex > sourceIndices[0]) {
            insertIndex -= sourceIndices.length;
        }
        
        // Logic for adopting Superset ID
        if (source.type === 'item') {
            const targetItem = newExercises[insertIndex] || (insertIndex > 0 ? newExercises[insertIndex-1] : null);
            
            if (target.type === 'superset' && targetItem && targetItem.supersetId) {
                 removedItems[0].supersetId = targetItem.supersetId;
            } else if (target.type === 'item' && targetItem && targetItem.supersetId) {
                 removedItems[0].supersetId = targetItem.supersetId;
            } else if (target.type === 'item' && targetItem && !targetItem.supersetId) {
                 delete removedItems[0].supersetId;
            }
        }
        
        newExercises.splice(insertIndex, 0, ...removedItems);
        
        updateEditingTemplate({ ...editingTemplate, exercises: newExercises });
        dragInfo.current = null;
        dragOverInfo.current = null;
        setDraggedOverIndices(null);
    };

    const handleMoveSuperset = (indices: number[], direction: 'up' | 'down') => {
        if (!editingTemplate) return;
        const newExercises = [...editingTemplate.exercises];
        const sortedIndices = indices.sort((a, b) => a - b);
        const startIndex = sortedIndices[0];
        const count = sortedIndices.length;
        
        const grouped = groupExercises(newExercises, editingTemplate.supersets);
        const currentGroupIndex = grouped.findIndex(g => g.type === 'superset' && g.indices[0] === startIndex);

        if (direction === 'up') {
             if (currentGroupIndex > 0) {
                const prevGroup = grouped[currentGroupIndex - 1];
                const prevGroupStart = prevGroup.type === 'superset' ? prevGroup.indices[0] : prevGroup.index;
                const removed = newExercises.splice(startIndex, count);
                newExercises.splice(prevGroupStart, 0, ...removed);
            }
        } else {
             if (currentGroupIndex < grouped.length - 1) {
                 const nextGroup = grouped[currentGroupIndex + 1];
                 const nextGroupEnd = nextGroup.type === 'superset' ? nextGroup.indices[nextGroup.indices.length - 1] : nextGroup.index;
                 const insertIndex = nextGroupEnd + 1;
                 const adjustedInsert = insertIndex - count;
                 const removed = newExercises.splice(startIndex, count);
                 newExercises.splice(adjustedInsert, 0, ...removed);
             }
        }
        
        updateEditingTemplate({ ...editingTemplate, exercises: newExercises });
    };

    // Superset Logic
    const handleCreateSuperset = (exerciseId: string) => {
        if (!editingTemplate) return;
        const exerciseIndex = editingTemplate.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex === -1) return;

        const newSupersetId = `superset-${Date.now()}`;
        const newSupersetDef = {
            id: newSupersetId,
            name: 'Superset',
            color: 'indigo',
        };

        const updatedExercises = [...editingTemplate.exercises];
        updatedExercises[exerciseIndex] = { ...updatedExercises[exerciseIndex], supersetId: newSupersetId };

        updateEditingTemplate({
            ...editingTemplate,
            exercises: updatedExercises,
            supersets: { ...editingTemplate.supersets, [newSupersetId]: newSupersetDef }
        });
    };

    const handleJoinSuperset = (exerciseId: string, targetSupersetId: string) => {
        if (!editingTemplate) return;
        const currentExercise = editingTemplate.exercises.find(ex => ex.id === exerciseId);
        if (!currentExercise) return;

        const exercisesWithoutItem = editingTemplate.exercises.filter(ex => ex.id !== exerciseId);
        let insertionIndex = -1;
        for (let i = exercisesWithoutItem.length - 1; i >= 0; i--) {
            if (exercisesWithoutItem[i].supersetId === targetSupersetId) {
                insertionIndex = i;
                break;
            }
        }

        const updatedItem = { ...currentExercise, supersetId: targetSupersetId };
        const finalExercises = [...exercisesWithoutItem];
        if (insertionIndex !== -1) {
            finalExercises.splice(insertionIndex + 1, 0, updatedItem);
        } else {
            finalExercises.push(updatedItem);
        }

        updateEditingTemplate({
            ...editingTemplate,
            exercises: finalExercises
        });
    };

    const handleUngroupSuperset = (supersetId: string) => {
        if (!editingTemplate) return;
        const updatedExercises = editingTemplate.exercises.map(ex => {
            if (ex.supersetId === supersetId) {
                const { supersetId: _, ...rest } = ex;
                return rest;
            }
            return ex;
        });
        const updatedSupersets = { ...editingTemplate.supersets };
        delete updatedSupersets[supersetId];

        updateEditingTemplate({
            ...editingTemplate,
            exercises: updatedExercises,
            supersets: updatedSupersets
        });
    };

    const handleRenameSuperset = (supersetId: string, newName: string) => {
        if (!editingTemplate || !editingTemplate.supersets) return;
        updateEditingTemplate({
            ...editingTemplate,
            supersets: {
                ...editingTemplate.supersets,
                [supersetId]: { ...editingTemplate.supersets[supersetId], name: newName }
            }
        });
    };

    if (!editingTemplate) return null;

    const isNewTemplate = originalTemplate?.name === t('train_new_custom_template_name');
    const isHiit = editingTemplate.routineType === 'hiit';
    
    const groupedExercises = groupExercises(editingTemplate.exercises, editingTemplate.supersets);

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-md z-30 -mx-2 sm:-mx-4 px-4 py-3 border-b border-white/10 flex items-center justify-between shadow-sm">
                <button 
                    onClick={handleBack} 
                    className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors rounded-full hover:bg-white/5"
                    aria-label="Back"
                >
                    <Icon name="arrow-down" className="rotate-90 w-6 h-6"/>
                </button>
                <h1 className="text-lg font-bold text-white tracking-wide">
                    {originalTemplate?.id === editingTemplate.id && !isNewTemplate ? t('template_editor_edit_title') : t('template_editor_create_title')}
                </h1>
                <button 
                    onClick={handleSave} 
                    className="bg-primary text-white font-bold py-1.5 px-4 rounded-full shadow-lg shadow-primary/20 hover:bg-primary-content transition-all text-sm active:scale-95"
                >
                    {t('common_save')}
                </button>
            </div>

            <div className="space-y-6 max-w-3xl mx-auto">
                {/* Basic Info Card */}
                <div className="bg-surface p-5 rounded-2xl shadow-sm space-y-5 border border-white/5">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pl-1">{t('template_editor_name_label')}</label>
                        <input 
                            type="text"
                            value={editingTemplate.name}
                            onChange={(e) => updateEditingTemplate({ ...editingTemplate, name: e.target.value })}
                            className="w-full bg-background border border-white/10 rounded-xl p-4 text-lg font-semibold text-white placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
                            placeholder={t('template_editor_name_placeholder')}
                            autoFocus={isNewTemplate}
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pl-1">{t('template_editor_description_label')}</label>
                        <textarea
                            value={editingTemplate.description}
                            onChange={(e) => updateEditingTemplate({ ...editingTemplate, description: e.target.value })}
                            className="w-full bg-background border border-white/10 rounded-xl p-4 text-sm text-text-primary placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner min-h-[80px] resize-y"
                            rows={2}
                            placeholder={t('template_editor_description_placeholder')}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 pl-1">{t('template_editor_routine_type')}</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => updateEditingTemplate({ ...editingTemplate, routineType: 'strength' })}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                                    !isHiit
                                    ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' 
                                    : 'bg-background border-transparent hover:bg-white/5 text-text-secondary border-white/5'
                                }`}
                            >
                                <Icon name="dumbbell" className={`w-8 h-8 mb-2 ${!isHiit ? 'animate-pulse' : ''}`} />
                                <span className="text-sm font-bold">{t('template_editor_type_strength')}</span>
                            </button>
                            <button
                                onClick={() => updateEditingTemplate({ ...editingTemplate, routineType: 'hiit', hiitConfig: editingTemplate.hiitConfig || { workTime: 30, restTime: 15, prepareTime: 10 } })}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                                    isHiit
                                    ? 'bg-rose-500/10 border-rose-500 text-rose-500 shadow-lg shadow-rose-500/10' 
                                    : 'bg-background border-transparent hover:bg-white/5 text-text-secondary border-white/5'
                                }`}
                            >
                                <Icon name="stopwatch" className={`w-8 h-8 mb-2 ${isHiit ? 'animate-pulse' : ''}`} />
                                <span className="text-sm font-bold">{t('template_editor_type_hiit')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* HIIT Config Card */}
                {isHiit && (
                    <div className="bg-surface/50 p-5 rounded-2xl shadow-sm border border-rose-500/20 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-4">
                             <Icon name="stopwatch" className="w-5 h-5 text-rose-400" />
                             <h3 className="font-bold text-text-primary">{t('template_editor_hiit_config')}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-background rounded-xl p-3 border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] text-text-secondary uppercase font-bold mb-1 text-center leading-tight">{t('template_editor_work_time')}</span>
                                <input 
                                    type="number" 
                                    value={editingTemplate.hiitConfig?.workTime || 0} 
                                    onChange={e => handleHiitConfigChange('workTime', e.target.value)} 
                                    className="w-full bg-transparent text-center text-xl sm:text-2xl font-mono font-bold text-rose-400 outline-none"
                                />
                            </div>
                            <div className="bg-background rounded-xl p-3 border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] text-text-secondary uppercase font-bold mb-1 text-center leading-tight">{t('template_editor_rest_time')}</span>
                                <input 
                                    type="number" 
                                    value={editingTemplate.hiitConfig?.restTime || 0} 
                                    onChange={e => handleHiitConfigChange('restTime', e.target.value)} 
                                    className="w-full bg-transparent text-center text-xl sm:text-2xl font-mono font-bold text-green-400 outline-none"
                                />
                            </div>
                             <div className="bg-background rounded-xl p-3 border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] text-text-secondary uppercase font-bold mb-1 text-center leading-tight">{t('template_editor_prepare_time')}</span>
                                <input 
                                    type="number" 
                                    value={editingTemplate.hiitConfig?.prepareTime || 0} 
                                    onChange={e => handleHiitConfigChange('prepareTime', e.target.value)} 
                                    className="w-full bg-transparent text-center text-xl sm:text-2xl font-mono font-bold text-yellow-400 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Exercises Section */}
                <div>
                     <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            {t('template_editor_exercises_title')}
                            <span className="text-xs text-text-secondary font-medium bg-surface-highlight/50 px-2.5 py-0.5 rounded-full border border-white/5">
                                {editingTemplate.exercises.length}
                            </span>
                        </h2>
                     </div>

                    {/* Exercises List */}
                    <div className="space-y-4" onDragOver={e => e.preventDefault()}>
                        {groupedExercises.map((group, groupIndex) => {
                            if (group.type === 'single') {
                                const we = group.exercise;
                                const index = group.index;
                                const exerciseInfo = getExerciseById(we.exerciseId);
                                if (!exerciseInfo) return null;
                                const isBeingDraggedOver = draggedOverIndices?.includes(index) && dragInfo.current?.indices[0] !== index;

                                if (isHiit) {
                                    return (
                                        <div
                                            key={we.id}
                                            className={`bg-surface border border-white/5 p-4 rounded-xl flex items-center gap-4 relative transition-all cursor-grab active:cursor-grabbing shadow-sm ${isBeingDraggedOver ? 'bg-surface-highlight/30' : ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, 'item', [index])}
                                            onDragEnter={(e) => handleDragEnter(e, 'item', [index])}
                                            onDragEnd={handleDrop}
                                            onDragOver={(e) => e.preventDefault()}
                                            title={t('template_editor_drag_to_reorder')}
                                        >
                                            <Icon name="sort" className="w-5 h-5 text-text-secondary/50 flex-shrink-0" />
                                            <span className="font-semibold text-text-primary flex-grow">{exerciseInfo.name}</span>
                                            <button onClick={() => handleRemoveExercise(we.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors">
                                                <Icon name="trash" className="w-5 h-5" />
                                            </button>
                                            {isBeingDraggedOver && <div className="absolute -top-1 left-0 w-full h-1 bg-primary rounded-full animate-pulse"></div>}
                                        </div>
                                    );
                                } else {
                                    return (
                                        <TemplateExerciseCard 
                                            key={we.id}
                                            workoutExercise={we}
                                            exerciseInfo={exerciseInfo}
                                            onUpdate={handleUpdateExercise}
                                            onRemove={handleRemoveExercise}
                                            onMoveUp={() => handleMoveExercise(index, index - 1)}
                                            onMoveDown={() => handleMoveExercise(index, index + 1)}
                                            isMoveUpDisabled={index === 0}
                                            isMoveDownDisabled={index === editingTemplate.exercises.length - 1}
                                            onDragStart={(e) => handleDragStart(e, 'item', [index])}
                                            onDragEnter={(e) => handleDragEnter(e, 'item', [index])}
                                            onDragEnd={handleDrop}
                                            isBeingDraggedOver={isBeingDraggedOver}
                                            onCreateSuperset={!we.supersetId ? () => handleCreateSuperset(we.id) : undefined}
                                            onJoinSuperset={!we.supersetId ? (supersetId) => handleJoinSuperset(we.id, supersetId) : undefined}
                                            availableSupersets={availableSupersets}
                                        />
                                    );
                                }
                            } else {
                                const definition = group.definition || { id: group.supersetId, name: 'Superset', color: 'indigo' };
                                const isBeingDraggedOver = draggedOverIndices?.length === group.indices.length && draggedOverIndices.every((val, i) => val === group.indices[i]) && dragInfo.current?.indices[0] !== group.indices[0];

                                return (
                                    <SupersetCard 
                                        key={group.supersetId} 
                                        definition={definition}
                                        onRename={(name) => handleRenameSuperset(group.supersetId, name)}
                                        onUngroup={() => handleUngroupSuperset(group.supersetId)}
                                        onAddExercise={() => startAddExercisesToTemplate(group.supersetId)}
                                        onMoveUp={() => handleMoveSuperset(group.indices, 'up')}
                                        onMoveDown={() => handleMoveSuperset(group.indices, 'down')}
                                        isReorganizeMode={true} // Template editor is implicitly reorganize mode-ish for superset drag
                                        onDragStart={(e) => handleDragStart(e, 'superset', group.indices)}
                                        onDragEnter={(e) => handleDragEnter(e, 'superset', group.indices)}
                                        onDragEnd={handleDrop}
                                        isBeingDraggedOver={isBeingDraggedOver}
                                    >
                                        {group.exercises.map((we, i) => {
                                            const index = group.indices[i];
                                            const exerciseInfo = getExerciseById(we.exerciseId);
                                            const isItemDraggedOver = draggedOverIndices?.includes(index) && dragInfo.current?.indices[0] !== index;

                                            if (!exerciseInfo) return null;
                                            return (
                                                <TemplateExerciseCard 
                                                    key={we.id}
                                                    workoutExercise={we}
                                                    exerciseInfo={exerciseInfo}
                                                    onUpdate={handleUpdateExercise}
                                                    onRemove={handleRemoveExercise}
                                                    onMoveUp={() => handleMoveExercise(index, index - 1)}
                                                    onMoveDown={() => handleMoveExercise(index, index + 1)}
                                                    isMoveUpDisabled={index === 0}
                                                    isMoveDownDisabled={index === editingTemplate.exercises.length - 1}
                                                    onDragStart={(e) => handleDragStart(e, 'item', [index])}
                                                    onDragEnter={(e) => handleDragEnter(e, 'item', [index])}
                                                    onDragEnd={handleDrop}
                                                    isBeingDraggedOver={isItemDraggedOver}
                                                />
                                            );
                                        })}
                                    </SupersetCard>
                                );
                            }
                        })}
                    </div>

                    {/* Empty State */}
                    {(editingTemplate.exercises.length === 0) && (
                        <div 
                            className="bg-surface/30 border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-surface/50 hover:border-primary/30 transition-all duration-300" 
                            onClick={() => startAddExercisesToTemplate()}
                        >
                            <div className="w-16 h-16 rounded-full bg-surface shadow-inner border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-primary/20 transition-all duration-300">
                                <Icon name="plus" className="w-8 h-8 text-primary group-hover:text-primary-content" />
                            </div>
                            <p className="text-text-primary font-semibold text-lg mb-1">{t('active_workout_empty_title')}</p>
                            <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">{t('active_workout_empty_desc')}</p>
                        </div>
                    )}
                    
                    {/* Add Button (Visible when list is not empty) */}
                    {editingTemplate.exercises.length > 0 && (
                        <button
                            onClick={() => startAddExercisesToTemplate()}
                            className="w-full mt-6 flex items-center justify-center space-x-2 bg-surface hover:bg-surface-highlight text-primary font-bold py-4 rounded-xl border border-dashed border-primary/20 hover:border-primary/40 transition-all active:scale-[0.98] shadow-sm"
                        >
                            <Icon name="plus" className="w-5 h-5" />
                            <span>{t('template_editor_add_exercises')}</span>
                        </button>
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

export default TemplateEditorPage;
