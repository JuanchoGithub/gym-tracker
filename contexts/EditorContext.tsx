import React, { createContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Routine, Exercise, WorkoutSession } from '../types';

export interface EditorContextType {
  // Template Editing
  editingTemplate: Routine | null;
  startTemplateEdit: (routine: Routine) => void;
  updateEditingTemplate: (routine: Routine) => void;
  endTemplateEdit: () => void;
  
  // Exercise Editing
  editingExercise: Exercise | null;
  startExerciseEdit: (exercise: Exercise, onComplete?: (ex: Exercise) => void) => void;
  endExerciseEdit: () => void;
  onExerciseEditComplete: ((ex: Exercise) => void) | undefined;
  
  // History Editing
  editingHistorySession: WorkoutSession | null;
  startHistoryEdit: (session: WorkoutSession) => void;
  endHistoryEdit: () => void;
  
  // Adding Exercises UI State
  isAddingExercisesToTemplate: boolean;
  startAddExercisesToTemplate: (supersetId?: string) => void;
  endAddExercisesToTemplate: () => void;
  addingTargetSupersetId: string | undefined;
}

export const EditorContext = createContext<EditorContextType>({} as EditorContextType);

export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [editingTemplate, setEditingTemplate] = useState<Routine | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingHistorySession, setEditingHistorySession] = useState<WorkoutSession | null>(null);
  
  const [onExerciseEditComplete, setOnExerciseEditComplete] = useState<((ex: Exercise) => void) | undefined>();
  
  const [isAddingExercisesToTemplate, setIsAddingExercisesToTemplate] = useState(false);
  const [addingTargetSupersetId, setAddingTargetSupersetId] = useState<string | undefined>(undefined);

  const startTemplateEdit = useCallback((routine: Routine) => setEditingTemplate(routine), []);
  const updateEditingTemplate = useCallback((routine: Routine) => setEditingTemplate(routine), []);
  const endTemplateEdit = useCallback(() => setEditingTemplate(null), []);

  const startExerciseEdit = useCallback((exercise: Exercise, onComplete?: (ex: Exercise) => void) => {
      setEditingExercise(exercise);
      setOnExerciseEditComplete(() => onComplete);
  }, []);

  const endExerciseEdit = useCallback(() => {
      setEditingExercise(null);
      setOnExerciseEditComplete(undefined);
  }, []);

  const startHistoryEdit = useCallback((session: WorkoutSession) => setEditingHistorySession(session), []);
  const endHistoryEdit = useCallback(() => setEditingHistorySession(null), []);

  const startAddExercisesToTemplate = useCallback((supersetId?: string) => {
      setAddingTargetSupersetId(supersetId);
      setIsAddingExercisesToTemplate(true);
  }, []);

  const endAddExercisesToTemplate = useCallback(() => {
      setIsAddingExercisesToTemplate(false);
      setAddingTargetSupersetId(undefined);
  }, []);

  const value = useMemo(() => ({
    editingTemplate, startTemplateEdit, updateEditingTemplate, endTemplateEdit,
    editingExercise, startExerciseEdit, endExerciseEdit, onExerciseEditComplete,
    editingHistorySession, startHistoryEdit, endHistoryEdit,
    isAddingExercisesToTemplate, startAddExercisesToTemplate, endAddExercisesToTemplate, addingTargetSupersetId
  }), [
    editingTemplate, startTemplateEdit, updateEditingTemplate, endTemplateEdit,
    editingExercise, startExerciseEdit, endExerciseEdit, onExerciseEditComplete,
    editingHistorySession, startHistoryEdit, endHistoryEdit,
    isAddingExercisesToTemplate, startAddExercisesToTemplate, endAddExercisesToTemplate, addingTargetSupersetId
  ]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};