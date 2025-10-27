import React, { useState, useContext, useMemo } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { BodyPart, ExerciseCategory } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../../constants/filters';
import { getBodyPartTKey, getCategoryTKey } from '../../utils/i18nUtils';

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

  const bodyPartFilterOptions = useMemo(() => [
    { value: 'All' as const, label: t('body_part_all') },
    ...BODY_PART_OPTIONS.map(bp => ({ value: bp, label: t(getBodyPartTKey(bp)) }))
  ], [t]);

  const categoryFilterOptions = useMemo(() => [
      { value: 'All' as const, label: t('category_all') },
      ...CATEGORY_OPTIONS.map(cat => ({ value: cat, label: t(getCategoryTKey(cat)) }))
  ], [t]);

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
  
  const getButtonText = () => {
    const count = selectedIds.length;
    if (count === 0) return t('add_exercises_button_empty');
    if (count === 1) return t('add_exercises_button_single');
    return t('add_exercises_button_plural', { count });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('add_exercises_modal_title')}>
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
                    <FilterDropdown
                        options={bodyPartFilterOptions}
                        selected={selectedBodyPart}
                        onSelect={setSelectedBodyPart}
                        label={t('filter_body_part')}
                    />
                    <FilterDropdown
                        options={categoryFilterOptions}
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
                            <p className="text-sm text-text-secondary">{t(getBodyPartTKey(exercise.bodyPart))}</p>
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
                    {getButtonText()}
                </button>
            </div>
        </div>
    </Modal>
  );
};

export default AddExercisesModal;
