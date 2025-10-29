import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { BodyPart, ExerciseCategory, Exercise } from '../types';
import { Icon } from '../components/common/Icon';
import FilterDropdown from '../components/common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../constants/filters';
import { getBodyPartTKey, getCategoryTKey } from '../utils/i18nUtils';
import ExerciseDetailModal from '../components/exercise/ExerciseDetailModal';
import { getBodyPartColor, getCategoryColor } from '../utils/colorUtils';

const AddExercisePage: React.FC = () => {
  const { 
    exercises, 
    startExerciseEdit, 
    endAddExercisesToWorkout, 
    isAddingExercisesToTemplate, 
    endAddExercisesToTemplate 
  } = useContext(AppContext);
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
        setNewlyCreatedId(null);
    }
  }, [newlyCreatedId, filteredExercises]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const handleBack = () => {
    if (isAddingExercisesToTemplate) {
      endAddExercisesToTemplate();
    } else {
      endAddExercisesToWorkout();
    }
  };
  
  const handleAdd = () => {
    if (isAddingExercisesToTemplate) {
      endAddExercisesToTemplate(selectedIds);
    } else {
      endAddExercisesToWorkout(selectedIds);
    }
  };

  const handleSelectFromDetail = (exerciseId: string) => {
    setSelectedIds(prev => [...new Set([...prev, exerciseId])]);
    setViewingExercise(null);
  };

  const handleAddAndCloseFromDetail = (exerciseId: string) => {
    const finalIds = [...new Set([...selectedIds, exerciseId])];
    handleAdd();
    setViewingExercise(null);
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
        setSelectedIds(prev => [...new Set([...prev, createdExercise.id])]);
        setNewlyCreatedId(createdExercise.id);
    });
  };

  const getAddButtonText = () => {
    const count = selectedIds.length;
    if (count === 0) return t('add_exercises_button_empty');
    if (count === 1) return t('add_exercises_button_single');
    return t('add_exercises_button_plural', { count });
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b border-secondary/20">
          <div className="container mx-auto flex items-center justify-between">
            <button onClick={handleBack} className="p-2 text-text-secondary hover:text-primary">
              <Icon name="arrow-down" className="rotate-90" />
            </button>
            <h1 className="text-xl font-bold text-center">{t('add_exercises_modal_title')}</h1>
            <button
              onClick={handleAdd}
              disabled={selectedIds.length === 0}
              className="font-bold py-2 px-4 rounded-lg shadow-lg text-sm bg-primary text-white hover:bg-sky-500 disabled:bg-secondary disabled:cursor-not-allowed"
            >
              {t('common_add')}
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 space-y-2 my-4">
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
          <div className="flex gap-2">
            <FilterDropdown options={bodyPartFilterOptions} selected={selectedBodyPart} onSelect={setSelectedBodyPart} label={t('filter_body_part')} />
            <FilterDropdown options={categoryFilterOptions} selected={selectedCategory} onSelect={setSelectedCategory} label={t('filter_category')} />
          </div>
        </div>
        
        <div className="flex-grow space-y-2 overflow-y-auto -mx-2 px-2 sm:-mx-4 sm:px-4 pb-4">
          {filteredExercises.map(exercise => {
            const isSelected = selectedIds.includes(exercise.id);
            return (
              <div
                key={exercise.id}
                ref={el => el ? exerciseRefs.current.set(exercise.id, el) : exerciseRefs.current.delete(exercise.id)}
                onClick={() => handleToggleSelect(exercise.id)}
                className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-primary/30 ring-2 ring-primary' : 'bg-surface hover:bg-slate-700'}`}
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

        <div className="flex-shrink-0 pt-4 mt-auto border-t border-secondary/20 flex flex-col sm:flex-row gap-3">
            <button onClick={handleCreateNewAndSelect} className="w-full bg-secondary text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                {t('common_create')} {t('common_new')}
            </button>
            <button
                onClick={handleAdd}
                disabled={selectedIds.length === 0}
                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-secondary disabled:cursor-not-allowed"
            >
                {getAddButtonText()}
            </button>
        </div>
      </div>

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

export default AddExercisePage;