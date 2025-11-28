
import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { BodyPart, ExerciseCategory, Exercise } from '../types';
import { Icon } from '../components/common/Icon';
import FilterDropdown from '../components/common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../constants/filters';
import { getBodyPartTKey, getCategoryTKey, getMuscleTKey } from '../utils/i18nUtils';
import ExerciseDetailModal from '../components/exercise/ExerciseDetailModal';
import { getBodyPartColor, getCategoryColor } from '../utils/colorUtils';
import { useMeasureUnit } from '../hooks/useWeight';
import { TranslationKey } from '../contexts/I18nContext';
import { searchExercises, getMatchedMuscles } from '../utils/searchUtils';

const AddExercisePage: React.FC = () => {
  const { 
    exercises, 
    startExerciseEdit, 
    endAddExercisesToWorkout, 
    isAddingExercisesToTemplate, 
    endAddExercisesToTemplate,
    allTimeBestSets
  } = useContext(AppContext);
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();
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
    let result = searchExercises(exercises, searchTerm, t);

    if (selectedBodyPart !== 'All') {
      result = result.filter(ex => ex.bodyPart === selectedBodyPart);
    }
    
    if (selectedCategory !== 'All') {
      result = result.filter(ex => ex.category === selectedCategory);
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory, t]);
  
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
  
  const handleAdd = (idsToAdd: string[]) => {
    if (idsToAdd.length === 0) return;
    if (isAddingExercisesToTemplate) {
      endAddExercisesToTemplate(idsToAdd);
    } else {
      endAddExercisesToWorkout(idsToAdd);
    }
  };

  const handleAddFromButton = () => {
    handleAdd(selectedIds);
  }

  const handleSelectFromDetail = (exerciseId: string) => {
    setSelectedIds(prev => [...new Set([...prev, exerciseId])]);
    setViewingExercise(null);
  };

  const handleAddAndCloseFromDetail = (exerciseId: string) => {
    const finalIds = [...new Set([...selectedIds, exerciseId])];
    handleAdd(finalIds);
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
              onClick={handleAddFromButton}
              disabled={selectedIds.length === 0}
              className="font-bold py-2 px-4 rounded-lg shadow-lg text-sm bg-primary text-white hover:bg-sky-500 disabled:bg-secondary disabled:cursor-not-allowed"
            >
              {t('common_add')}
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 space-y-2 my-2">
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
        
        <div className="flex-grow space-y-3 overflow-y-auto -mx-2 px-2 sm:-mx-4 sm:px-4 pb-4" style={{ overscrollBehaviorY: 'contain' }}>
          {filteredExercises.map(exercise => {
            const isSelected = selectedIds.includes(exercise.id);
            const bestSet = allTimeBestSets[exercise.id];
            const matchedMuscles = getMatchedMuscles(exercise, searchTerm, t);
            
            return (
              <div
                key={exercise.id}
                ref={el => {
                  if (el) {
                    exerciseRefs.current.set(exercise.id, el);
                  } else {
                    exerciseRefs.current.delete(exercise.id);
                  }
                }}
                onClick={() => handleToggleSelect(exercise.id)}
                className={`group relative p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-3
                  ${isSelected 
                      ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(56,189,248,0.15)]' 
                      : 'bg-[#1e293b] border-white/5 hover:bg-surface-highlight/30 hover:border-white/10 shadow-sm'
                  }`}
              >
                <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-0.5
                        ${isSelected 
                            ? 'bg-primary scale-110 shadow-sm' 
                            : 'border-2 border-white/20 group-hover:border-white/40 bg-transparent'
                        }`}>
                        {isSelected && <Icon name="check" className="w-4 h-4 text-white stroke-[3]" />}
                    </div>

                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`font-bold text-base truncate pr-2 transition-colors ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                              {exercise.name}
                          </h3>
                          <button
                              onClick={(e) => { e.stopPropagation(); setViewingExercise(exercise); }}
                              className="text-text-secondary/50 hover:text-primary p-1.5 rounded-full hover:bg-white/5 transition-colors flex-shrink-0 -mt-1.5 -mr-1.5"
                              aria-label={`View details for ${exercise.name}`}
                          >
                              <Icon name="question-mark-circle" className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wide ${getBodyPartColor(exercise.bodyPart)}`}>
                              {t(getBodyPartTKey(exercise.bodyPart))}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wide ${getCategoryColor(exercise.category)}`}>
                              {t(getCategoryTKey(exercise.category))}
                            </span>
                            {exercise.isTimed && (
                              <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wide">
                                  <Icon name="stopwatch" className="w-3 h-3" />
                                  <span>{t('set_type_timed')}</span>
                              </span>
                            )}
                            {matchedMuscles.map((m, idx) => (
                                <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wide ${m.type === 'primary' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {t(getMuscleTKey(m.name))}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Best Set Info Bar */}
                <div className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs border border-white/5 ${isSelected ? 'bg-primary/5' : 'bg-black/20'}`}>
                      {bestSet ? (
                          <div className="flex items-center gap-2 w-full">
                                <Icon name="trophy" className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                                <span className="text-text-secondary/70 uppercase tracking-wider font-semibold text-[10px] mr-auto">{t('history_best_set')}</span>
                                <span className="text-text-primary font-mono font-bold">
                                  {displayWeight(bestSet.weight)} {t(`workout_${weightUnit}` as TranslationKey)} × {bestSet.reps}
                                </span>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2 w-full opacity-50">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                              <span className="text-text-secondary/70 italic">No records yet</span>
                          </div>
                      )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-shrink-0 pt-4 mt-auto border-t border-secondary/20 flex gap-3">
            <button onClick={handleCreateNewAndSelect} className="w-full bg-secondary text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                {t('common_create')} {t('common_new')}
            </button>
            <button
                onClick={handleAddFromButton}
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
