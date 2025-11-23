
import React, { useState, useMemo } from 'react';
import { PREDEFINED_EXERCISES } from '../../constants/exercises';

interface ExerciseAnimationProps {
  exerciseId: string;
}

const ExerciseAnimation: React.FC<ExerciseAnimationProps> = ({ exerciseId }) => {
  const [hasError, setHasError] = useState(false);

  const exerciseDef = useMemo(() => 
    PREDEFINED_EXERCISES.find(e => e.id === exerciseId), 
  [exerciseId]);

  if (!exerciseDef || hasError) return null;

  // Construct path: /assets/exercises/animations/svg/{id}_{name_snake_case}.svg
  // Example: ex-1_bench_press.svg
  const snakeCaseName = exerciseDef.name.toLowerCase().replace(/ /g, '_');
  const fileName = `${exerciseDef.id}_${snakeCaseName}.svg`;
  const src = `/assets/exercises/animations/svg/${fileName}`;

  return (
    <div className="w-full flex justify-center mb-6 bg-black/20 rounded-xl overflow-hidden border border-white/5">
      <img 
        src={src} 
        alt={`${exerciseDef.name} animation`}
        onError={() => {
            console.warn(`Failed to load animation for ${exerciseDef.name} at ${src}`);
            setHasError(true);
        }}
        className="max-h-[300px] w-auto"
        loading="lazy"
      />
    </div>
  );
};

export default ExerciseAnimation;
