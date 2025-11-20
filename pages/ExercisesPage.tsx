
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Exercise, BodyPart, ExerciseCategory } from '../types';
import ExerciseDetailModal from '../components/exercise/ExerciseDetailModal';
import { Icon } from '../components/common/Icon';
import FilterDropdown from '../components/common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../constants/filters';
import { getBodyPartTKey, getCategoryTKey } from '../utils/i18nUtils';
import { useMeasureUnit } from '../hooks/useWeight';
import { getBodyPartColor, getCategoryColor } from '../utils/colorUtils';
import { TranslationKey } from '../contexts/I18nContext';
import { searchExercises } from '../utils/searchUtils';

const ExercisesPage: React.FC = () => {
  const { exercises, startExerciseEdit, allTimeBestSets } = useContext(AppContext);
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

    return result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      }
      return b.name.localeCompare(a.name);
    });
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory, sortOrder, t]);
  
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  const handleAddNew = () => {
    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: 'New Exercise',
      bodyPart: 'Chest',
      category: 'Barbell',
      notes: '',
    };
    startExerciseEdit(newExercise);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">{t('nav_exercises')}</h1>
        <button
          onClick={handleAddNew}
          className="bg-primary hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 text-sm active:scale-95"
        >
          <Icon name="plus" className="w-5 h-5" />
          <span>{t('common_add')}</span>
        </button>
      </div>

      <div className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur-xl py-4 -mx-3 sm:-mx-4 px-3 sm:px-4 border-b border-white/5 shadow-sm">
        <div className="flex flex-col gap-3 max-w-4xl mx-auto">
            <div className="flex gap-3 items-center">
                <div className="relative flex-grow group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Icon name="search" className="w-5 h-5 text-text-secondary group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface/50 border border-white/10 rounded-xl py-3 pl-11 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-surface text-white placeholder-text-secondary/70 transition-all"
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-white"
                        >
                            <Icon name="x" className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="flex-shrink-0 flex items-center justify-center bg-surface/50 border border-white/10 text-text-secondary hover:text-white hover:bg-surface font-medium p-3 rounded-xl transition-all active:scale-95"
                  title={sortOrder === 'asc' ? "Sort Z-A" : "Sort A-Z"}
                >
                  <Icon name="sort" className={`w-6 h-6 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </button>
            </div>
            <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <FilterDropdown
                      options={bodyPartFilterOptions}
                      selected={selectedBodyPart}
                      onSelect={setSelectedBodyPart}
                      label={t('filter_body_part')}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <FilterDropdown
                      options={categoryFilterOptions}
                      selected={selectedCategory}
                      onSelect={setSelectedCategory}
                      label={t('filter_category')}
                      align="right"
                  />
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredExercises.length > 0 ? filteredExercises.map(exercise => {
          const bestSet = allTimeBestSets[exercise.id];
          return (
            <div
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
              className="group relative bg-[#1e293b] border border-white/5 rounded-2xl shadow-lg hover:shadow-xl hover:border-primary/20 hover:bg-[#253146] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.99]"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="p-5">
                <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">{exercise.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide border border-white/5 whitespace-nowrap ${getBodyPartColor(exercise.bodyPart)}`}>
                        {t(getBodyPartTKey(exercise.bodyPart))}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide border border-white/5 ${getCategoryColor(exercise.category)}`}>
                        {t(getCategoryTKey(exercise.category))}
                    </span>
                    {exercise.isTimed && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 flex items-center gap-1">
                            <Icon name="stopwatch" className="w-3 h-3" />
                            <span>{t('set_type_timed')}</span>
                        </span>
                    )}
                </div>
              </div>
              
              <div className="mt-auto px-5 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
                  {bestSet ? (
                     <div className="flex items-center gap-2 text-primary-content">
                          <Icon name="trophy" className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-mono font-bold">
                            {displayWeight(bestSet.weight)} {t(`workout_${weightUnit}` as TranslationKey)} × {bestSet.reps}
                          </span>
                     </div>
                  ) : (
                     <div className="text-text-secondary/40 text-xs italic flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                        No records yet
                     </div>
                  )}
                  <Icon name="arrow-right" className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors -rotate-45 group-hover:rotate-0 transform duration-300" />
              </div>
            </div>
          )
        }) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-secondary">
                <div className="w-20 h-20 bg-surface-highlight/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Icon name="search" className="w-10 h-10 opacity-50" />
                </div>
                <p className="text-lg font-medium">{t('exercises_no_match')}</p>
            </div>
        )}
      </div>

      {selectedExercise && (
        <ExerciseDetailModal
          isOpen={!!selectedExercise}
          onClose={() => setSelectedExercise(null)}
          exercise={selectedExercise}
        />
      )}
    </div>
  );
};

export default ExercisesPage;
