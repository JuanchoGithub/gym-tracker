


import React from 'react';
import { Exercise } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import ExerciseAnimation from './ExerciseAnimation';

interface DescriptionTabProps {
  exercise: Exercise;
}

const DescriptionTab: React.FC<DescriptionTabProps> = ({ exercise }) => {
  const { t, t_ins } = useI18n();
  const isCustom = exercise.id.startsWith('custom-');
  
  const instructionKey = exercise.id.replace(/-/g, '_') + '_ins';
  const instructions = t_ins(instructionKey);
  
  const hasStockInstructions = instructions && instructions.steps.length > 0 && instructions.title !== instructionKey;

  const renderMuscleTags = (muscles: string[] | undefined, labelKey: string, colorClass: string) => {
      if (!muscles || muscles.length === 0) return null;
      return (
          <div className="mb-3">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-1.5">{t(labelKey as any)}</span>
              <div className="flex flex-wrap gap-1.5">
                  {muscles.map(m => (
                      <span key={m} className={`text-xs px-2 py-1 rounded-md font-medium border border-white/5 ${colorClass}`}>
                          {m}
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
      <ExerciseAnimation exerciseId={exercise.id} />
      
      {/* Target Muscles Section */}
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
