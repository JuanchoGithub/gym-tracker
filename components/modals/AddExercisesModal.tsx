import React, { useState, useContext, useMemo } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { BodyPart, ExerciseCategory } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';

interface AddExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newExerciseIds: string[]) => void;
}

const AddExercisesModal: React.FC<AddExercisesModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { exercises } = useContext(AppContext);
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const bodyParts: (BodyPart | 'All')[] = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Calves', 'Forearms', 'Cardio'];
  const categories: (ExerciseCategory | 'All')[] = ['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Assisted Bodyweight', 'Reps Only', 'Cardio', 'Duration'];

  const filteredExercises = useMemo(() => {
    return exercises
      .filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(ex => selectedBodyPart === 'All' || ex.bodyPart === selectedBodyPart)
      .filter(ex => selectedCategory === 'All' || ex.category === selectedCategory)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory]);
  
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
        if (prev.includes(id)) {
            return prev.filter(i => i !== id);
        } else {
            return [...prev, id];
        }
    });
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    onClose();
    setSelectedIds([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={"Add Exercises"}>
        <div className="flex flex-col h-[70vh] max-h-[550px]">
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
                {filteredExercises.map(exercise => {
                  const isSelected = selectedIds.includes(exercise.id);
                  return (
                    <div
                        key={exercise.id}
                        onClick={() => handleToggleSelect(exercise.id)}
                        className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-primary/30 ring-2 ring-primary' : 'bg-slate-900/50 hover:bg-slate-700'}`}
                    >
                        <div>
                            <h3 className="font-semibold text-text-primary">{exercise.name}</h3>
                            <p className="text-sm text-text-secondary">{exercise.bodyPart}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-primary border-primary' : 'border-secondary'}`}>
                            {isSelected && <Icon name="check" className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                  );
                })}
            </div>
            
            <div className="flex-shrink-0 pt-4">
                 <button 
                    onClick={handleAdd}
                    disabled={selectedIds.length === 0}
                    className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-secondary disabled:cursor-not-allowed"
                >
                    Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}Exercise{selectedIds.length !== 1 ? 's' : ''}
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default AddExercisesModal;