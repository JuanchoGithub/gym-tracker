
import React, { useState, useContext, useMemo } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { useMeasureUnit } from '../../hooks/useWeight';
import { Exercise } from '../../types';
import { PARENT_CHILD_EXERCISES } from '../../constants/ratios';
import { TranslationKey } from '../../contexts/I18nContext';

interface CascadeUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentExerciseId: string;
    newParentMax: number;
}

const CascadeUpdateModal: React.FC<CascadeUpdateModalProps> = ({ isOpen, onClose, parentExerciseId, newParentMax }) => {
    const { t } = useI18n();
    const { exercises, profile, updateOneRepMax } = useContext(AppContext);
    const { displayWeight, weightUnit } = useMeasureUnit();
    
    const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());

    const parentExercise = exercises.find(e => e.id === parentExerciseId);
    
    const suggestions = useMemo(() => {
        if (!PARENT_CHILD_EXERCISES[parentExerciseId]) return [];

        return PARENT_CHILD_EXERCISES[parentExerciseId].map(relation => {
            const childExercise = exercises.find(e => e.id === relation.targetId);
            if (!childExercise) return null;

            const projectedMax = Math.round(newParentMax * relation.ratio / 2.5) * 2.5; // Round to nearest 2.5
            const currentMax = profile.oneRepMaxes?.[childExercise.id]?.weight || 0;

            // Only suggest if projected is higher than current
            if (projectedMax <= currentMax) return null;

            return {
                exercise: childExercise,
                currentMax,
                projectedMax
            };
        }).filter((item): item is { exercise: Exercise, currentMax: number, projectedMax: number } => item !== null);

    }, [parentExerciseId, newParentMax, exercises, profile.oneRepMaxes]);

    // Auto-select all initially
    React.useEffect(() => {
        if (suggestions.length > 0) {
            setSelectedChildIds(new Set(suggestions.map(s => s.exercise.id)));
        }
    }, [suggestions]);

    const handleApply = () => {
        suggestions.forEach(s => {
            if (selectedChildIds.has(s.exercise.id)) {
                updateOneRepMax(s.exercise.id, s.projectedMax, 'calculated');
            }
        });
        onClose();
    };

    if (suggestions.length === 0) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('orm_cascade_title')}>
            <div className="space-y-4">
                <p className="text-text-secondary text-sm">
                    {t('orm_cascade_desc', { parent: parentExercise?.name || 'Main Lift' })}
                </p>
                
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {suggestions.map(item => (
                        <button
                            key={item.exercise.id}
                            onClick={() => {
                                const newSet = new Set(selectedChildIds);
                                if (newSet.has(item.exercise.id)) newSet.delete(item.exercise.id);
                                else newSet.add(item.exercise.id);
                                setSelectedChildIds(newSet);
                            }}
                            className={`w-full p-3 rounded-xl border flex justify-between items-center transition-all ${
                                selectedChildIds.has(item.exercise.id) 
                                    ? 'bg-indigo-500/10 border-indigo-500/50' 
                                    : 'bg-surface border-white/5 opacity-70'
                            }`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-white text-sm">{item.exercise.name}</div>
                                <div className="text-xs text-text-secondary">
                                    {displayWeight(item.currentMax)} -> <span className="text-success font-bold">{displayWeight(item.projectedMax)} {t(('workout_' + weightUnit) as TranslationKey)}</span>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedChildIds.has(item.exercise.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                                {selectedChildIds.has(item.exercise.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={onClose} className="flex-1 bg-surface text-text-secondary font-bold py-3 rounded-xl hover:bg-white/5 transition-colors">
                        {t('orm_cascade_skip')}
                    </button>
                    <button onClick={handleApply} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                        {t('orm_cascade_apply')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CascadeUpdateModal;
