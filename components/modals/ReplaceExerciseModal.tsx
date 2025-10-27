import React, { useState, useContext, useMemo } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Exercise, BodyPart, ExerciseCategory } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../../constants/filters';
import { getBodyPartTKey, getCategoryTKey } from '../../utils/i18nUtils';

interface ReplaceExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (newExerciseId: string) => void;
  title?: string;
  buttonText?: string;
}

const ReplaceExerciseModal: React.FC<ReplaceExerciseModalProps> = ({ isOpen, onClose, onSelectExercise, title, buttonText }) => {
  const { exercises } = useContext(AppContext);
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');

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

  const handleSelectExercise = (exerciseId: string) => {
    onSelectExercise(exerciseId);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || t('replace_exercise_modal_title')}>
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
                {filteredExercises.length > 0 ? filteredExercises.map(exercise => (
                <div
                    key={exercise.id}
                    className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center"
                >
                    <div>
                        <h3 className="font-semibold text-text-primary">{t(getBodyPartTKey(exercise.name))}</h3>
                        <p className="text-sm text-text-secondary">{t(getBodyPartTKey(exercise.bodyPart))}</p>
                    </div>
                    <button 
                        onClick={() => handleSelectExercise(exercise.id)}
                        className="bg-primary text-white font-bold py-1 px-3 rounded-md text-sm"
                    >
                        {buttonText || t('replace_exercise_modal_button')}
                    </button>
                </div>
                )) : <p className="text-center text-text-secondary">{t('replace_exercise_modal_no_match')}</p>}
            </div>
        </div>
    </Modal>
  );
};

export default ReplaceExerciseModal;
