
import { useState } from 'react';
import { Exercise, Routine, WorkoutExercise } from '../../types';

export const useWorkoutModals = () => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [isValidationErrorOpen, setIsValidationErrorOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  
  // State for dynamic features
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isWeightInputModalOpen, setIsWeightInputModalOpen] = useState(false);
  const [weightModalDefaults, setWeightModalDefaults] = useState<{ bodyWeight?: number, extraWeight?: number }>({});
  const [pendingExerciseUpdate, setPendingExerciseUpdate] = useState<{ exercise: WorkoutExercise, setIndex: number } | null>(null);
  
  // Suggestion & Upgrade States
  const [suggestedRoutine, setSuggestedRoutine] = useState<{ 
      routine: Routine; 
      focus: string; 
      isFallback?: boolean; 
      description?: string; 
  } | null>(null);

  const [upgradeCandidate, setUpgradeCandidate] = useState<{ 
      workoutExercise: WorkoutExercise; 
      targetExercise: Exercise; 
      suggestedWeight: number; 
  } | null>(null);

  return {
    state: {
      isDetailsModalOpen,
      isConfirmingFinish,
      isValidationErrorOpen,
      validationErrors,
      viewingExercise,
      isOnboardingOpen,
      isWeightInputModalOpen,
      weightModalDefaults,
      pendingExerciseUpdate,
      suggestedRoutine,
      upgradeCandidate,
    },
    actions: {
      setIsDetailsModalOpen,
      setIsConfirmingFinish,
      setIsValidationErrorOpen,
      setValidationErrors,
      setViewingExercise,
      setIsOnboardingOpen,
      setIsWeightInputModalOpen,
      setWeightModalDefaults,
      setPendingExerciseUpdate,
      setSuggestedRoutine,
      setUpgradeCandidate,
    }
  };
};
