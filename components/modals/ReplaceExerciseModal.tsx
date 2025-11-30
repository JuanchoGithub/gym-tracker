
import React, { useState, useContext, useMemo } from 'react';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Exercise, BodyPart, ExerciseCategory } from '../../types';
import { Icon } from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../../constants/filters';
import { getBodyPartTKey, getCategoryTKey, getMuscleTKey } from '../../utils/i18nUtils';
import ExerciseDetailModal from '../exercise/ExerciseDetailModal';
import { getBodyPartColor, getCategoryColor } from '../../utils/colorUtils';
import { searchExercises, getMatchedMuscles } from '../../utils/searchUtils';
import { useExerciseName } from '../../hooks/useExerciseName';

interface ReplaceExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (newExerciseId: string) => void;
  title?: string;
  buttonText?: string;
}

const ReplaceExerciseModal: React.FC<ReplaceExerciseModalProps> = ({ isOpen, onClose, onSelectExercise, title, buttonText }) => {
  const { exercises, useLocalizedExerciseNames } = useContext(AppContext);
  const { t } = useI18n();
  const getExerciseName = useExerciseName();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

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

    return result.sort((a, b) => getExerciseName(a).localeCompare(getExerciseName(b)));
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory, t, getExerciseName, useLocalizedExerciseNames]);

  const handleSelectExercise = (exerciseId: string) => {
    onSelectExercise(exerciseId);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen && !viewingExercise} onClose={onClose} title={title || t('replace_exercise_modal_title')}>
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

              <div className="flex-grow space-y-2 overflow-y-auto pr-2">
                  {filteredExercises.length > 0 ? filteredExercises.map(exercise => {
                    const matchedMuscles = getMatchedMuscles(exercise, searchTerm, t);
                    return (
                      <div
                          key={exercise.id}
                          className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center"
                      >
                          <div className="flex items-center gap-2 flex-grow min-w-0">
                              <button
                                  onClick={(e) => { e.stopPropagation(); setViewingExercise(exercise); }}
                                  className="p-1 text-text-secondary hover:text-primary transition-colors flex-shrink-0"
                                  aria-label={`View details for ${exercise.name}`}
                              >
                                  <Icon name="question-mark-circle" className="w-5 h-5" />
                              </button>
                              <div className="truncate">
                                  <h3 className="font-semibold text-text-primary truncate">{getExerciseName(exercise)}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getBodyPartColor(exercise.bodyPart)}`}>{t(getBodyPartTKey(exercise.bodyPart))}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(exercise.category)}`}>{t(getCategoryTKey(exercise.category))}</span>
                                      {exercise.isTimed && (
                                        <span className="text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1">
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
                          <button 
                              onClick={() => handleSelectExercise(exercise.id)}
                              className="bg-primary text-white font-bold py-1 px-3 rounded-md text-sm flex-shrink-0 ml-2"
                          >
                              {buttonText || t('replace_exercise_modal_button')}
                          </button>
                      </div>
                    );
                  }) : <p className="text-center text-text-secondary">{t('replace_exercise_modal_no_match')}</p>}
              </div>
          </div>
      </Modal>

      {viewingExercise && (
        <ExerciseDetailModal
            isOpen={!!viewingExercise}
            onClose={() => setViewingExercise(null)}
            exercise={viewingExercise}
        />
      )}
    </>
  );
};

export default ReplaceExerciseModal;
