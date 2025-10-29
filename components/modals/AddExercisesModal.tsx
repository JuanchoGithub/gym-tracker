import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { BodyPart, ExerciseCategory, Exercise } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../../constants/filters';
import { getBodyPartTKey, getCategoryTKey } from '../../utils/i18nUtils';
import ExerciseDetailModal from '../exercise/ExerciseDetailModal';
import { getBodyPartColor, getCategoryColor } from '../../utils/colorUtils';

interface AddExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newExerciseIds: string[]) => void;
}

const AddExercisesModal: React.FC<AddExercisesModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { exercises, startExerciseEdit } = useContext(AppContext);
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const exerciseRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

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
  
  useEffect(() => {
    if (newlyCreatedId) {
        const node = exerciseRefs.current.get(newlyCreatedId);
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Reset the ID so it doesn't scroll again on re-renders
        setNewlyCreatedId(null);
    }
  }, [newlyCreatedId, filteredExercises]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
        if (prev.includes(id)) {
            return prev.filter(i => i !== id);
        } else {
            return [...prev, id];
        }
    });
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchTerm('');
    setSelectedBodyPart('All');
    setSelectedCategory('All');
    onClose();
  };

  const handleAdd = () => {
    if (selectedIds.length === 0) return;
    onAdd(selectedIds);
    handleClose();
  };

  const handleSelectFromDetail = (exerciseId: string) => {
    setSelectedIds(prev => [...new Set([...prev, exerciseId])]);
    setViewingExercise(null);
  };

  const handleAddAndCloseFromDetail = (exerciseId: string) => {
    const finalIds = [...new Set([...selectedIds, exerciseId])];
    onAdd(finalIds);
    setViewingExercise(null);
    handleClose();
  };
  
  const handleCreateNewAndSelect = () => {
    const newExercise: Exercise = {
        id: `custom-${Date.now()}`,
        name: 'New Exercise',
        bodyPart: 'Chest',
        category: 'Barbell',
        notes: '',
    };
    startExerciseEdit(newExercise, (createdExercise) => {
        // This callback runs after the exercise editor closes and the new exercise is saved
        setSelectedIds(prev => [...new Set([...prev, createdExercise.id])]);
        setNewlyCreatedId(createdExercise.id);
    });
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        title={undefined}
        contentClassName="bg-surface rounded-lg shadow-xl w-[calc(100%-1rem)] max-w-3xl h-[calc(100%-2rem)] max-h-[800px] m-auto p-4 sm:p-6"
      >
          <div 
            className="flex flex-col h-full"
            style={{ visibility: viewingExercise ? 'hidden' : 'visible' }}
          >
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <button onClick={handleClose} className="p-1 text-text-secondary hover:text-text-primary">
                      <Icon name="x" className="w-6 h-6" />
                  </button>
                  <h2 className="text-xl font-bold text-text-primary">{t('add_exercises_modal_title')}</h2>
                  <div className="flex items-center gap-2 sm:gap-4">
                      <button onClick={handleCreateNewAndSelect} className="text-primary font-semibold py-1 px-3 text-base">
                          {t('common_create')}
                      </button>
                      <button onClick={handleAdd} className="text-primary font-bold py-1 px-3 rounded-lg text-base disabled:text-text-secondary disabled:cursor-not-allowed" disabled={selectedIds.length === 0}>
                          {selectedIds.length > 0 ? `${t('common_add')} (${selectedIds.length})` : t('common_add')}
                      </button>
                  </div>
              </div>

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
                          // FIX: Corrected the ref callback to ensure it returns `void` and handles component unmounting by deleting the ref from the map. This resolves a TypeScript type error where the `Map.set` return value was incompatible with the expected ref callback return type.
                          ref={el => {
                            if (el) {
                              exerciseRefs.current.set(exercise.id, el);
                            } else {
                              exerciseRefs.current.delete(exercise.id);
                            }
                          }}
                          onClick={() => handleToggleSelect(exercise.id)}
                          className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-primary/30 ring-2 ring-primary' : 'bg-slate-900/50 hover:bg-slate-700'}`}
                      >
                          <div className="flex items-center gap-2 flex-grow min-w-0">
                              <button
                                  onClick={(e) => { e.stopPropagation(); setViewingExercise(exercise); }}
                                  className="p-1 text-text-secondary hover:text-primary transition-colors flex-shrink-0 z-10"
                                  aria-label={`View details for ${exercise.name}`}
                              >
                                  <Icon name="question-mark-circle" className="w-5 h-5" />
                              </button>
                              <div className="truncate">
                                <h3 className="font-semibold text-text-primary truncate">{exercise.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getBodyPartColor(exercise.bodyPart)}`}>{t(getBodyPartTKey(exercise.bodyPart))}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(exercise.category)}`}>{t(getCategoryTKey(exercise.category))}</span>
                                </div>
                              </div>
                          </div>
                          <div className="flex-shrink-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-primary border-primary' : 'border-secondary'}`}>
                                  {isSelected && <Icon name="check" className="w-4 h-4 text-white" />}
                              </div>
                          </div>
                      </div>
                    );
                  })}
              </div>
          </div>
      </Modal>

      {viewingExercise && (
        <ExerciseDetailModal
            isOpen={!!viewingExercise}
            onClose={() => setViewingExercise(null)}
            exercise={viewingExercise}
            onSelectForAdd={handleSelectFromDetail}
            onAddAndClose={handleAddAndCloseFromDetail}
            onExerciseCreated={(createdExercise) => {
              setSelectedIds(prev => [...new Set([...prev, createdExercise.id])]);
              setNewlyCreatedId(createdExercise.id);
              setViewingExercise(null);
            }}
        />
      )}
    </>
  );
};

export default AddExercisesModal;