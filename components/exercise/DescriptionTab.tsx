
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
    <div className="space-y-4">
      <ExerciseAnimation exerciseId={exercise.id} />
      {renderContent()}
    </div>
  );
};

export default DescriptionTab;
