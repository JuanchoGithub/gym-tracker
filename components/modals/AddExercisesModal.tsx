
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
                className="flex-grow overflow-y-auto px-2 sm:px-4 py-4 space-y-2"
                style={{ overscrollBehaviorY: 'contain' }}
              >
                  {filteredExercises.map(exercise => {
                    const isSelected = selectedIds.includes(exercise.id);
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
                          className={`group relative p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-3 sm:gap-4
                            ${isSelected 
                                ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(56,189,248,0.15)]' 
                                : 'bg-surface/40 border-white/5 hover:bg-surface/60 hover:border-white/10'
                            }`}
                      >
                          {/* Custom Selection Checkbox */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
                              ${isSelected 
                                  ? 'bg-primary scale-110 shadow-sm' 
                                  : 'border-2 border-white/20 group-hover:border-white/40 bg-transparent'
                              }`}>
                              {isSelected && <Icon name="check" className="w-4 h-4 text-white stroke-[3]" />}
                          </div>

                          <div className="flex-grow min-w-0">
                              <div className="flex justify-between items-start">
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
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wide ${getBodyPartColor(exercise.bodyPart)}`}>
                                    {t(getBodyPartTKey(exercise.bodyPart))}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wide ${getCategoryColor(exercise.category)}`}>
                                    {t(getCategoryTKey(exercise.category))}
                                  </span>
                                  {exercise.isTimed && (
                                    <span className="text-[10px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wide">
                                        <Icon name="stopwatch" className="w-3 h-3" />
                                        <span>{t('set_type_timed')}</span>
                                    </span>
                                  )}
                              </div>
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
                      onClick={handleAdd}
                      disabled={selectedIds.length === 0}
                      className="flex-[2] bg-primary hover:bg-primary-content text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 active:scale-[0.98]"
                  >
                      {selectedIds.length > 0 ? `${t('common_add')} (${selectedIds.length})` : t('common_add')}
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
