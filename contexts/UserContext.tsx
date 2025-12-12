
import React, { createContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Profile } from '../types';

export type WeightUnit = 'kg' | 'lbs';
export type FontSize = 'normal' | 'large' | 'xl';

export interface UserContextType {
  profile: Profile;
  updateProfileInfo: (info: Partial<Profile>) => void;
  currentWeight: number | undefined;
  logWeight: (weight: number) => void;
  measureUnit: 'metric' | 'imperial';
  setMeasureUnit: (unit: 'metric' | 'imperial') => void;
  
  // 1RM
  updateOneRepMax: (exerciseId: string, weight: number, method: 'calculated' | 'tested', date?: number) => void;
  snoozeOneRepMaxUpdate: (exerciseId: string, until: number) => void;
  undoAutoUpdate: (exerciseId: string) => void;
  dismissAutoUpdate: (exerciseId: string) => void;
  applyCalculated1RM: (exerciseId: string, weight: number) => void;
  logUnlock: (from: string, to: string) => void;

  // Settings
  defaultRestTimes: { normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; };
  setDefaultRestTimes: React.Dispatch<React.SetStateAction<{ normal: number; warmup: number; drop: number; timed: number; effort: number; failure: number; }>>;
  useLocalizedExerciseNames: boolean;
  setUseLocalizedExerciseNames: React.Dispatch<React.SetStateAction<boolean>>;
  keepScreenAwake: boolean;
  setKeepScreenAwake: React.Dispatch<React.SetStateAction<boolean>>;
  enableNotifications: boolean;
  setEnableNotifications: React.Dispatch<React.SetStateAction<boolean>>;
  selectedVoiceURI: string | null;
  setSelectedVoiceURI: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Appearance
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  
  importUserData: (data: any) => void;
}

export const UserContext = createContext<UserContextType>({} as UserContextType);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useLocalStorage<Profile>('profile', { weightHistory: [] });
  const [measureUnit, setMeasureUnit] = useLocalStorage<'metric' | 'imperial'>('measureUnit', 'metric');
  const [defaultRestTimes, setDefaultRestTimes] = useLocalStorage('defaultRestTimes', { normal: 90, warmup: 60, drop: 30, timed: 60, effort: 180, failure: 300 });
  const [useLocalizedExerciseNames, setUseLocalizedExerciseNames] = useLocalStorage('useLocalizedExerciseNames', false);
  const [keepScreenAwake, setKeepScreenAwake] = useLocalStorage('keepScreenAwake', true);
  const [enableNotifications, setEnableNotifications] = useLocalStorage('enableNotifications', false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useLocalStorage<string | null>('selectedVoiceURI', null);
  const [fontSize, setFontSize] = useLocalStorage<FontSize>('fontSize', 'normal');

  const currentWeight = useMemo(() => {
      const sorted = [...profile.weightHistory].sort((a, b) => b.date - a.date);
      return sorted.length > 0 ? sorted[0].weight : undefined;
  }, [profile.weightHistory]);

  const updateProfileInfo = useCallback((info: Partial<Profile>) => {
      setProfile(prev => ({ ...prev, ...info }));
  }, [setProfile]);

  const logWeight = useCallback((weight: number) => {
      setProfile(prev => ({
          ...prev,
          weightHistory: [...prev.weightHistory, { date: Date.now(), weight }]
      }));
  }, [setProfile]);

  const updateOneRepMax = useCallback((exerciseId: string, weight: number, method: 'calculated' | 'tested', date?: number) => {
      setProfile(prev => ({
          ...prev,
          oneRepMaxes: {
              ...prev.oneRepMaxes,
              [exerciseId]: { exerciseId, weight, date: date || Date.now(), method }
          },
          autoUpdated1RMs: (() => {
              const newAuto = { ...prev.autoUpdated1RMs };
              delete newAuto[exerciseId];
              return newAuto;
          })()
      }));
  }, [setProfile]);

  const snoozeOneRepMaxUpdate = useCallback((exerciseId: string, until: number) => {
      setProfile(prev => ({
          ...prev,
          oneRepMaxSnoozes: {
              ...prev.oneRepMaxSnoozes,
              [exerciseId]: Date.now() + until
          }
      }));
  }, [setProfile]);

  const undoAutoUpdate = useCallback((exerciseId: string) => {
      const entry = profile.autoUpdated1RMs?.[exerciseId];
      if (entry) {
          updateOneRepMax(exerciseId, entry.oldWeight, 'calculated');
      }
  }, [profile.autoUpdated1RMs, updateOneRepMax]);

  const dismissAutoUpdate = useCallback((exerciseId: string) => {
      setProfile(prev => {
          const newAuto = { ...prev.autoUpdated1RMs };
          delete newAuto[exerciseId];
          return { ...prev, autoUpdated1RMs: newAuto };
      });
  }, [setProfile]);

  const applyCalculated1RM = useCallback((exerciseId: string, weight: number) => {
      updateOneRepMax(exerciseId, weight, 'calculated');
  }, [updateOneRepMax]);

  const logUnlock = useCallback((from: string, to: string) => {
      setProfile(prev => ({
          ...prev,
          unlocks: [...(prev.unlocks || []), { date: Date.now(), fromExercise: from, toExercise: to }]
      }));
  }, [setProfile]);

  // Apply Font Size Effect
  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'large') {
        root.style.fontSize = '112.5%'; // ~18px base
    } else if (fontSize === 'xl') {
        root.style.fontSize = '125%'; // ~20px base
    } else {
        root.style.fontSize = '100%'; // ~16px base
    }
  }, [fontSize]);

  const importUserData = useCallback((data: any) => {
      if (data.profile) {
          setProfile(prev => ({ 
              ...prev, 
              ...data.profile, 
              lastImported: Date.now() 
          }));
      }
      if (data.settings) {
          if (data.settings.measureUnit) setMeasureUnit(data.settings.measureUnit);
          if (data.settings.defaultRestTimes) setDefaultRestTimes(data.settings.defaultRestTimes);
          if (typeof data.settings.useLocalizedExerciseNames === 'boolean') setUseLocalizedExerciseNames(data.settings.useLocalizedExerciseNames);
          if (typeof data.settings.keepScreenAwake === 'boolean') setKeepScreenAwake(data.settings.keepScreenAwake);
          if (typeof data.settings.enableNotifications === 'boolean') setEnableNotifications(data.settings.enableNotifications);
          if (data.settings.selectedVoiceURI !== undefined) setSelectedVoiceURI(data.settings.selectedVoiceURI);
          if (data.settings.fontSize) setFontSize(data.settings.fontSize);
      }
  }, [setProfile, setMeasureUnit, setDefaultRestTimes, setUseLocalizedExerciseNames, setKeepScreenAwake, setEnableNotifications, setSelectedVoiceURI, setFontSize]);

  const value = useMemo(() => ({
    profile, updateProfileInfo, currentWeight, logWeight, measureUnit, setMeasureUnit,
    updateOneRepMax, snoozeOneRepMaxUpdate, undoAutoUpdate, dismissAutoUpdate, applyCalculated1RM, logUnlock,
    defaultRestTimes, setDefaultRestTimes,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake,
    enableNotifications, setEnableNotifications,
    selectedVoiceURI, setSelectedVoiceURI,
    fontSize, setFontSize,
    importUserData
  }), [
    profile, updateProfileInfo, currentWeight, logWeight, measureUnit, setMeasureUnit,
    updateOneRepMax, snoozeOneRepMaxUpdate, undoAutoUpdate, dismissAutoUpdate, applyCalculated1RM, logUnlock,
    defaultRestTimes, setDefaultRestTimes,
    useLocalizedExerciseNames, setUseLocalizedExerciseNames,
    keepScreenAwake, setKeepScreenAwake,
    enableNotifications, setEnableNotifications,
    selectedVoiceURI, setSelectedVoiceURI,
    fontSize, setFontSize,
    importUserData
  ]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
