import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { Exercise, BodyPart, ExerciseCategory } from '../types';
import ExerciseDetailModal from '../components/exercise/ExerciseDetailModal';
import { Icon } from '../components/common/Icon';
import FilterDropdown from '../components/common/FilterDropdown';

const ExercisesPage: React.FC = () => {
  const { exercises, startExerciseEdit } = useContext(AppContext);
  const { t } = useI18n();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'All'>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const bodyParts: (BodyPart | 'All')[] = ['All', 'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Calves', 'Forearms', 'Mobility', 'Cardio'];
  const categories: (ExerciseCategory | 'All')[] = ['All', 'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Assisted Bodyweight', 'Kettlebell', 'Plyometrics', 'Reps Only', 'Cardio', 'Duration'];

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
          <span>Add</span>
        </button>
      </div>

      <div className="sticky top-4 bg-background/80 backdrop-blur-sm z-10 py-2">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full sm:flex-grow">
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
            <div className="flex w-full sm:w-auto gap-2">
                <FilterDropdown<BodyPart | 'All'>
                    options={bodyParts}
                    selected={selectedBodyPart}
                    onSelect={setSelectedBodyPart}
                    label={t('filter_body_part')}
                />
                <FilterDropdown<ExerciseCategory | 'All'>
                    options={categories}
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                    label={t('filter_category')}
                />
                <button
                  onClick={toggleSortOrder}
                  className="flex-shrink-0 flex items-center justify-center bg-surface border border-secondary/50 text-text-primary font-medium py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <Icon name={sortOrder === 'asc' ? 'arrow-down' : 'arrow-up'} className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredExercises.length > 0 ? filteredExercises.map(exercise => (
          <div
            key={exercise.id}
            onClick={() => setSelectedExercise(exercise)}
            className="bg-surface p-4 rounded-lg shadow cursor-pointer hover:bg-slate-700 transition-colors flex justify-between items-center"
          >
            <div>
              <h3 className="font-bold text-text-primary">{exercise.name}</h3>
              <p className="text-sm text-text-secondary">{exercise.bodyPart}</p>
            </div>
            <span className="text-xs bg-secondary/30 text-text-secondary px-2 py-1 rounded-full">{exercise.category}</span>
          </div>
        )) : <p className="text-center text-text-secondary">No exercises match your criteria.</p>}
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