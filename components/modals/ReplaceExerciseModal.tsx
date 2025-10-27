import React, { useState, useContext, useMemo } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Exercise, BodyPart, ExerciseCategory } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';

interface ReplaceExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: (newExerciseId: string) => void;
}

const ReplaceExerciseModal: React.FC<ReplaceExerciseModalProps> = ({ isOpen, onClose, onReplace }) => {
  const { exercises } = useContext(AppContext);
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');

  const bodyParts: (BodyPart | 'All')[] = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Calves', 'Forearms', 'Cardio'];
  const categories: (ExerciseCategory | 'All')[] = ['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Assisted Bodyweight', 'Reps Only', 'Cardio', 'Duration'];

  const filteredExercises = useMemo(() => {
    return exercises
      .filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(ex => selectedBodyPart === 'All' || ex.bodyPart === selectedBodyPart)
      .filter(ex => selectedCategory === 'All' || ex.category === selectedCategory)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory]);

  const handleSelectExercise = (exerciseId: string) => {
    onReplace(exerciseId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Replace Exercise">
        <div className="flex flex-col h-[80vh] max-h-[600px]">
            <div className="flex-shrink-0 space-y-2 mb-4">
                 <div className="relative flex-grow">
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-secondary/50 rounded-lg shadow-sm py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="search" className="w-5 h-5 text-text-secondary" />
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <FilterDropdown<BodyPart | 'All'>
                        options={bodyParts}
                        selected={selectedBodyPart}
                        onSelect={setSelectedBodyPart}
                        label={t('filter_body_part')}
                    />
                    <FilterDropdown<ExerciseCategory | 'All'>
                        options={categories}
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                        label={t('filter_category')}
                    />
                </div>
            </div>

            <div className="flex-grow space-y-2 overflow-y-auto pr-2">
                {filteredExercises.length > 0 ? filteredExercises.map(exercise => (
                <div
                    key={exercise.id}
                    className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center"
                >
                    <div>
                        <h3 className="font-semibold text-text-primary">{exercise.name}</h3>
                        <p className="text-sm text-text-secondary">{exercise.bodyPart}</p>
                    </div>
                    <button 
                        onClick={() => handleSelectExercise(exercise.id)}
                        className="bg-primary text-white font-bold py-1 px-3 rounded-md text-sm"
                    >
                        Replace
                    </button>
                </div>
                )) : <p className="text-center text-text-secondary">No exercises match.</p>}
            </div>
        </div>
    </Modal>
  );
};

export default ReplaceExerciseModal;
