
import React, { useState, useMemo } from 'react';
import { Exercise } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import ExerciseAnimation from './ExerciseAnimation';
import { getMuscleTKey, getBodyPartTKey } from '../../utils/i18nUtils';
import MuscleHeatmap from '../insights/MuscleHeatmap';
import { BODY_PART_TO_MUSCLES } from '../../constants/muscles';

interface DescriptionTabProps {
  exercise: Exercise;
}

type ViewMode = 'motion' | 'anatomy';
type AnatomyFocus = 'targets' | 'primary' | 'secondary' | 'bodypart';

const DescriptionTab: React.FC<DescriptionTabProps> = ({ exercise }) => {
  const { t, t_ins } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('motion');
  const [anatomyFocus, setAnatomyFocus] = useState<AnatomyFocus>('targets');

  const isCustom = exercise.id.startsWith('custom-');
  
  const instructionKey = exercise.id.replace(/-/g, '_') + '_ins';
  const instructions = t_ins(instructionKey);
  
  const hasStockInstructions = instructions && instructions.steps.length > 0 && instructions.title !== instructionKey;

  const highlightMap = useMemo(() => {
      if (viewMode !== 'anatomy') return undefined;

      const map: Record<string, string> = {};
      const primaryColor = '#ef4444'; // Red
      const secondaryColor = '#f97316'; // Orange
      const bodyPartColor = '#3b82f6'; // Blue

      if (anatomyFocus === 'targets' || anatomyFocus === 'primary') {
          exercise.primaryMuscles?.forEach(m => map[m] = primaryColor);
      }
      
      if (anatomyFocus === 'targets' || anatomyFocus === 'secondary') {
          exercise.secondaryMuscles?.forEach(m => map[m] = secondaryColor);
      }

      if (anatomyFocus === 'bodypart') {
          const groupMuscles = BODY_PART_TO_MUSCLES[exercise.bodyPart] || [];
          groupMuscles.forEach(m => map[m] = bodyPartColor);
      }

      return map;
  }, [viewMode, anatomyFocus, exercise]);

  const renderMuscleTags = (muscles: string[] | undefined, labelKey: string, colorClass: string) => {
      if (!muscles || muscles.length === 0) return null;
      return (
          <div className="mb-3">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">{t(labelKey as any)}</span>
              <div className="flex flex-wrap gap-1.5">
                  {muscles.map(m => (
                      <span key={m} className={`text-xs px-2 py-1 rounded-md font-medium border border-white/5 ${colorClass}`}>
                          {t(getMuscleTKey(m))}
                      </span>
                  ))}
              </div>
          </div>
      );
  };

  const renderContent = () => {
    const header = (
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-lg font-semibold text-primary">{t('description_instructions')}</h3>
        <span className="text-xs text-text-secondary font-mono opacity-50">({exercise.id})</span>
      </div>
    );

    if (isCustom) {
      return (
        <div>
          {header}
          {exercise.notes ? (
            <p className="text-text-secondary whitespace-pre-wrap">{exercise.notes}</p>
          ) : (
            <p className="text-text-secondary">No custom notes available for this exercise.</p>
          )}
        </div>
      );
    }
    
    return (
      <div>
        {header}
        {hasStockInstructions ? (
          <ul className="list-disc list-inside space-y-2 text-text-secondary">
            {instructions.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        ) : (
          <p className="text-text-secondary">No instructions available for this exercise.</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
        {/* View Mode Toggle */}
        <div className="flex justify-center mb-4">
            <div className="bg-black/30 p-1 rounded-xl flex gap-1 border border-white/10">
                <button 
                    onClick={() => setViewMode('motion')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'motion' ? 'bg-surface-highlight text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
                >
                    {t('exercise_view_motion')}
                </button>
                <button 
                    onClick={() => setViewMode('anatomy')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'anatomy' ? 'bg-surface-highlight text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
                >
                    {t('exercise_view_muscles')}
                </button>
            </div>
        </div>

      {viewMode === 'motion' ? (
          <div className="-mx-5 mb-6 w-[calc(100%+2.5rem)] bg-black/20 sm:rounded-xl overflow-hidden border-y sm:border border-white/5">
              <ExerciseAnimation exerciseId={exercise.id} />
          </div>
      ) : (
          <div className="flex flex-col items-center mb-6">
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                  <button 
                    onClick={() => setAnatomyFocus('targets')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${anatomyFocus === 'targets' ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-white/10 text-text-secondary'}`}
                  >
                      {t('exercise_anatomy_toggle_targets')}
                  </button>
                  <button 
                    onClick={() => setAnatomyFocus('primary')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${anatomyFocus === 'primary' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-transparent border-white/10 text-text-secondary'}`}
                  >
                      {t('exercise_anatomy_toggle_primary')}
                  </button>
                  {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                    <button 
                        onClick={() => setAnatomyFocus('secondary')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${anatomyFocus === 'secondary' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-transparent border-white/10 text-text-secondary'}`}
                    >
                        {t('exercise_anatomy_toggle_secondary')}
                    </button>
                  )}
                  <button 
                    onClick={() => setAnatomyFocus('bodypart')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${anatomyFocus === 'bodypart' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-transparent border-white/10 text-text-secondary'}`}
                  >
                      {t('exercise_anatomy_whole', { part: t(getBodyPartTKey(exercise.bodyPart)) })}
                  </button>
              </div>
              <div className="-mx-5 w-[calc(100%+2.5rem)] bg-black/20 sm:rounded-xl overflow-hidden border-y sm:border border-white/5">
                  <MuscleHeatmap highlightMap={highlightMap} />
              </div>
          </div>
      )}
      
      {/* Target Muscles Section (Text Tags) */}
      {(exercise.primaryMuscles?.length > 0 || exercise.secondaryMuscles?.length > 0) && (
          <div className="bg-surface-highlight/20 p-4 rounded-xl border border-white/5">
              {renderMuscleTags(exercise.primaryMuscles, 'exercise_primary_targets', 'bg-primary/10 text-primary')}
              {renderMuscleTags(exercise.secondaryMuscles, 'exercise_secondary_targets', 'bg-secondary/10 text-text-secondary')}
          </div>
      )}

      {renderContent()}
    </div>
  );
};

export default DescriptionTab;
