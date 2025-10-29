import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Exercise, BodyPart, ExerciseCategory } from '../types';
import ExerciseDetailModal from '../components/exercise/ExerciseDetailModal';
import { Icon } from '../components/common/Icon';
import FilterDropdown from '../components/common/FilterDropdown';
import { BODY_PART_OPTIONS, CATEGORY_OPTIONS } from '../constants/filters';
import { getBodyPartTKey, getCategoryTKey } from '../utils/i18nUtils';
import { useWeight } from '../hooks/useWeight';
import { getBodyPartColor, getCategoryColor } from '../utils/colorUtils';

const ExercisesPage: React.FC = () => {
  const { exercises, startExerciseEdit, allTimeBestSets } = useContext(AppContext);
  const { t } = useI18n();
  const { displayWeight, unit } = useWeight();
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
    return exercises
      .filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(ex => selectedBodyPart === 'All' || ex.bodyPart === selectedBodyPart)
      .filter(ex => selectedCategory === 'All' || ex.category === selectedCategory)
      .sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.name.localeCompare(b.name);
        }
        return b.name.localeCompare(a.name);
      });
  }, [exercises, searchTerm, selectedBodyPart, selectedCategory, sortOrder]);
  
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('nav_exercises')}</h1>
        <button
          onClick={handleAddNew}
          className="bg-primary hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
        >
          <Icon name="plus" className="w-4 h-4" />
          <span>{t('common_add')}</span>
        </button>
      </div>

      <div className="sticky top-4 bg-background/80 backdrop-blur-sm z-10 py-2">
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
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
                <button
                  onClick={toggleSortOrder}
                  className="flex-shrink-0 flex items-center justify-center bg-surface border border-secondary/50 text-text-primary font-medium py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Icon name="sort" className="w-5 h-5" />
                </button>
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

      <div className="space-y-3">
        {filteredExercises.length > 0 ? filteredExercises.map(exercise => {
          const bestSet = allTimeBestSets[exercise.id];
          return (
            <div
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
              className="bg-surface p-3 sm:p-4 rounded-lg shadow cursor-pointer hover:bg-slate-700 flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-text-primary">{exercise.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getBodyPartColor(exercise.bodyPart)}`}>{t(getBodyPartTKey(exercise.bodyPart))}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(exercise.category)}`}>{t(getCategoryTKey(exercise.category))}</span>
                </div>
                {bestSet && (
                  <p className="text-xs text-warning mt-2 font-mono flex items-center gap-1">
                      <Icon name="trophy" className="w-3 h-3" />
                      <span>{displayWeight(bestSet.weight)} {t(`workout_${unit}`)} x {bestSet.reps} {t('workout_reps')}</span>
                  </p>
                )}
              </div>
            </div>
          )
        }) : <p className="text-center text-text-secondary">{t('exercises_no_match')}</p>}
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
