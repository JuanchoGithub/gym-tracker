import React from 'react';
import { Exercise } from '../../types';
import { useI18n } from '../../hooks/useI18n';

interface DescriptionTabProps {
  exercise: Exercise;
}

const DescriptionTab: React.FC<DescriptionTabProps> = ({ exercise }) => {
  const { t, t_ins } = useI18n();
  // Fix: Generate the instruction key based on exercise ID.
  const instructionKey = exercise.id.replace('-', '_') + '_ins';
  const instructions = t_ins(instructionKey);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">{t('description_instructions')}</h3>
        {instructions && instructions.steps.length > 0 && instructions.title !== instructionKey ? (
          <ul className="list-disc list-inside space-y-2 text-text-secondary">
            {instructions.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        ) : (
          <p className="text-text-secondary">No instructions available for this exercise.</p>
        )}
      </div>
      {exercise.notes && (
         <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Notes</h3>
          <p className="text-text-secondary">{exercise.notes}</p>
        </div>
      )}
    </div>
  );
};

export default DescriptionTab;
