
import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { BodyPart, ExerciseCategory, Exercise } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../../constants/filters';
import { getBodyPartTKey, getCategoryTKey, getMuscleTKey } from '../../utils/i18nUtils';
import ExerciseDetailModal from '../exercise/ExerciseDetailModal';
import { getBodyPartColor, getCategoryColor } from '../../utils/colorUtils';
import { useMeasureUnit } from '../../hooks/useWeight';
import { TranslationKey } from '../../contexts/I18nContext';
import { searchExercises, getMatchedMuscles } from '../../utils/searchUtils';
import { useExerciseName } from '../../hooks/useExerciseName';

interface AddExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newExerciseIds: string[]) => void;
}

const AddExercisesModal: React.FC<AddExercisesModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { exercises, startExerciseEdit, allTimeBestSets, useLocalizedExerciseNames } = useContext(AppContext);
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();
  const getExerciseName = useExerciseName();

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
    let result = searchExercises(exercises, searchTerm, t, useLocalizedExerciseNames);

    if (selectedBodyPart !== 'All') {
      result = result.filter(ex => ex.bodyPart === selectedBodyPart);
    }
    
    if (selectedCategory !== 'All') {
      result = result.filter(ex => ex.category === selectedCategory);
    }

    return result.sort((a, b) => {
        const nameA = getExerciseName(a);
        const nameB = getExerciseName(b);
        return nameA.localeCompare(nameB);
    });
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory, t, getExerciseName, useLocalizedExerciseNames]);
  
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
        setSelectedIds(prev => [...new Set([...prev, createdExercise.id])]);
        setNewlyCreatedId(createdExercise.id);
    });
  };

  const handleAddFromButton = () => {
      handleAdd();
  }

  const getAddButtonText = () => {
    const count = selectedIds.length;
    if (count === 0) return t('add_exercises_button_empty');
    if (count === 1) return t('add_exercises_button_single');
    return t('add_exercises_button_plural', { count });
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        title={undefined}
        contentClassName="bg-[#0f172a] rounded-2xl shadow-2xl w-[calc(100%-1rem)] max-w-3xl h-[85vh] max-h-[800px] m-auto flex flex-col overflow-hidden border border-white/10"
      >
          <div 
            className="flex flex-col h-full"
            style={{ visibility: viewingExercise ? 'hidden' : 'visible' }}
          >
              {/* Header */}
              <div className="px-4 py-4 sm:px-6 sm:pt-6 sm:pb-4 bg-[#0f172a] z-10 flex-shrink-0 border-b border-white/5">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('add_exercises_modal_title')}</h2>
                      <button onClick={handleClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors">
                          <Icon name="x" className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="space-y-3">
                       <div className="relative">
                          <input
                              type="text"
                              placeholder={t('search_placeholder')}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full bg-surface-highlight/30 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Icon name="search" className="w-5 h-5 text-text-secondary" />
                          </div>
                      </div>
                       <div className="flex gap-2">
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
              </div>

              {/* Exercise List */}
              <div
                className="flex-grow overflow-y-auto px-2 sm:px-4 py-4 space-y-3"
                style={{ overscrollBehaviorY: 'contain' }}
              >
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
                                        {getExerciseName(exercise)}
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
                  
                  {filteredExercises.length === 0 && (
                      <div className="text-center py-12 text-text-secondary">
                          <p>{t('exercises_no_match')}</p>
                      </div>
                  )}
              </div>
              
              {/* Footer Action */}
              <div className="p-4 border-t border-white/10 bg-[#0f172a]/95 backdrop-blur flex gap-3 flex-shrink-0 z-20 safe-area-bottom">
                  <button 
                    onClick={handleCreateNewAndSelect} 
                    className="flex-1 bg-surface hover:bg-surface-highlight text-text-primary font-semibold py-3.5 rounded-xl transition-colors border border-white/5"
                  >
                      {t('common_create')} {t('common_new')}
                  </button>
                  <button
                      onClick={handleAddFromButton}
                      disabled={selectedIds.length === 0}
                      className="flex-[2] bg-primary hover:bg-primary-content text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 active:scale-[0.98]"
                  >
                      {getAddButtonText()}
                  </button>
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
