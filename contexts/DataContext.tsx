
import React, { createContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Routine, WorkoutSession, Exercise, PerformedSet } from '../types';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { pushData, pullData, getLastSyncTime, setLastSyncTime } from '../services/syncService';

export interface DataContextType {
    routines: Routine[];
    upsertRoutine: (routine: Routine) => void;
    upsertRoutines: (routines: Routine[]) => void;
    deleteRoutine: (id: string) => void;

    exercises: Exercise[];
    rawExercises: Exercise[];
    setRawExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
    getExerciseById: (id: string) => Exercise | undefined;

    history: WorkoutSession[];
    saveCompletedWorkout: (session: WorkoutSession) => void;
    deleteHistorySession: (id: string) => void;
    updateHistorySession: (id: string, updates: Partial<WorkoutSession>) => void;

    allTimeBestSets: Record<string, PerformedSet>;
    checkInState: { active: boolean };
    handleCheckInResponse: (reason: string) => void;

    importDataData: (data: any) => void;
    syncWithCloud: (token: string) => Promise<{ success: boolean; error?: string }>;
}

export const DataContext = createContext<DataContextType>({} as DataContextType);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [historyRaw, setHistoryRaw] = useLocalStorage<WorkoutSession[]>('history', []);
    const [routinesRaw, setRoutinesRaw] = useLocalStorage<Routine[]>('routines', PREDEFINED_ROUTINES);
    const [rawExercises, setRawExercises] = useLocalStorage<Exercise[]>('exercises', PREDEFINED_EXERCISES);

    // Helper to synchronize local storage exercises with the latest code definitions
    // This ensures that if we update biomechanics (e.g. adding Forearms to Deadlift), 
    // the user's local data gets updated automatically.
    const syncExercises = useCallback((currentExercises: Exercise[]): Exercise[] => {
        let hasChanges = false;
        const updated = currentExercises.map(ex => {
            if (ex.id.startsWith('ex-')) {
                const def = PREDEFINED_EXERCISES.find(p => p.id === ex.id);
                if (def) {
                    // Compare muscle arrays (sort to ignore order differences)
                    const pMuscles = JSON.stringify(ex.primaryMuscles?.sort() || []);
                    const defPMuscles = JSON.stringify(def.primaryMuscles?.sort() || []);
                    const sMuscles = JSON.stringify(ex.secondaryMuscles?.sort() || []);
                    const defSMuscles = JSON.stringify(def.secondaryMuscles?.sort() || []);

                    // If definitions drift, force update to the code's version
                    if (pMuscles !== defPMuscles || sMuscles !== defSMuscles) {
                        hasChanges = true;
                        return {
                            ...ex,
                            primaryMuscles: def.primaryMuscles,
                            secondaryMuscles: def.secondaryMuscles,
                            // We can also sync category if needed, but muscles are the priority
                            category: def.category,
                            bodyPart: def.bodyPart
                        };
                    }
                }
            }
            return ex;
        });
        return hasChanges ? updated : currentExercises;
    }, []);

    // Run sync on mount to fix any stale data immediately
    useEffect(() => {
        setRawExercises(current => syncExercises(current));

        // Migration: Ensure all existing items have updatedAt
        const now = Date.now();
        setHistoryRaw(prev => {
            if (prev.some(h => !h.updatedAt)) {
                return prev.map(h => h.updatedAt ? h : { ...h, updatedAt: now });
            }
            return prev;
        });
        setRoutinesRaw(prev => {
            if (prev.some(r => !r.updatedAt)) {
                return prev.map(r => r.updatedAt ? r : { ...r, updatedAt: now });
            }
            return prev;
        });
        setRawExercises(prev => {
            if (prev.some(e => !e.updatedAt)) {
                return prev.map(e => e.updatedAt ? e : { ...e, updatedAt: now });
            }
            return prev;
        });
    }, [setRawExercises, setHistoryRaw, setRoutinesRaw, syncExercises]);

    const getExerciseById = useCallback((id: string) => {
        return rawExercises.find(e => e.id === id);
    }, [rawExercises]);

    // Public filtered state (excluding soft-deleted items)
    const history = useMemo(() =>
        historyRaw
            .filter(h => !h.deletedAt)
            .sort((a, b) => b.startTime - a.startTime),
        [historyRaw]);
    const routines = useMemo(() => routinesRaw.filter(r => !r.deletedAt), [routinesRaw]);
    const exercises = useMemo(() => rawExercises.filter(e => !e.deletedAt), [rawExercises]);

    const allTimeBestSets = useMemo(() => {
        const bests: Record<string, PerformedSet> = {};
        history.forEach(session => {
            session.exercises.forEach(ex => {
                ex.sets.forEach(set => {
                    if (set.type === 'normal' && set.isComplete) {
                        const currentBest = bests[ex.exerciseId];
                        if (!currentBest || set.weight > currentBest.weight || (set.weight === currentBest.weight && set.reps > currentBest.reps)) {
                            bests[ex.exerciseId] = set;
                        }
                    }
                });
            });
        });
        return bests;
    }, [history]);

    const checkInState = useMemo(() => {
        const now = Date.now();
        const lastSession = history.length > 0 ? history[0] : null;
        if (!lastSession) return { active: false };
        const daysSince = (now - lastSession.startTime) / (1000 * 60 * 60 * 24);
        return { active: daysSince > 10 };
    }, [history]);

    const handleCheckInResponse = useCallback((reason: string) => {
        console.log('Check in reason:', reason);
        // Logic could be expanded here to log the reason
    }, []);

    const saveCompletedWorkout = useCallback((session: WorkoutSession) => {
        const timestampedSession = { ...session, updatedAt: Date.now() };
        setHistoryRaw(prev => [timestampedSession, ...prev]);

        // Also sync exercises here to ensure any newly finished workout 
        // uses the absolute latest definitions for stats calculation next time
        setRawExercises(current => syncExercises(current));
    }, [setHistoryRaw, setRawExercises, syncExercises]);

    const upsertRoutine = useCallback((routine: Routine) => {
        const timestampedRoutine = { ...routine, updatedAt: Date.now() };
        setRoutinesRaw(prev => {
            const idx = prev.findIndex(r => r.id === routine.id);
            if (idx >= 0) {
                const newRoutines = [...prev];
                newRoutines[idx] = timestampedRoutine;
                return newRoutines;
            }
            return [...prev, timestampedRoutine];
        });
    }, [setRoutinesRaw]);

    const upsertRoutines = useCallback((newRoutines: Routine[]) => {
        const timestamped = newRoutines.map(r => ({ ...r, updatedAt: Date.now() }));
        setRoutinesRaw(prev => {
            const combined = [...prev];
            timestamped.forEach(routine => {
                const idx = combined.findIndex(r => r.id === routine.id);
                if (idx >= 0) combined[idx] = routine;
                else combined.push(routine);
            });
            return combined;
        });
    }, [setRoutinesRaw]);

    const deleteRoutine = useCallback((id: string) => {
        setRoutinesRaw(prev => prev.map(r => r.id === id ? { ...r, deletedAt: Date.now(), updatedAt: Date.now() } : r));
    }, [setRoutinesRaw]);

    const deleteHistorySession = useCallback((id: string) => {
        setHistoryRaw(prev => prev.map(h => h.id === id ? { ...h, deletedAt: Date.now(), updatedAt: Date.now() } : h));
    }, [setHistoryRaw]);

    const updateHistorySession = useCallback((id: string, updates: Partial<WorkoutSession>) => {
        setHistoryRaw(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s));
    }, [setHistoryRaw]);

    const importDataData = useCallback((data: any) => {
        if (Array.isArray(data.history)) setHistoryRaw(data.history);
        if (Array.isArray(data.routines)) {
            setRoutinesRaw(() => {
                const merged = [...PREDEFINED_ROUTINES];
                data.routines.forEach((ir: Routine) => {
                    const existingIdx = merged.findIndex(m => m.id === ir.id);
                    if (existingIdx >= 0) merged[existingIdx] = ir;
                    else merged.push(ir);
                });
                return merged;
            });
        }
        if (Array.isArray(data.exercises)) {
            setRawExercises(() => {
                const merged = [...PREDEFINED_EXERCISES];
                data.exercises.forEach((ie: Exercise) => {
                    const existingIdx = merged.findIndex(m => m.id === ie.id);
                    if (existingIdx >= 0) {
                        const freshDef = merged[existingIdx];
                        merged[existingIdx] = {
                            ...ie,
                            primaryMuscles: freshDef.primaryMuscles,
                            secondaryMuscles: freshDef.secondaryMuscles
                        };
                    } else {
                        merged.push(ie);
                    }
                });
                return merged;
            });
        }
    }, [setHistoryRaw, setRoutinesRaw, setRawExercises]);


    const syncWithCloud = useCallback(async (token: string) => {
        try {
            const lastSyncTime = getLastSyncTime() || 0;
            const now = Date.now();

            // 1. Prepare push payload (only items updated since last sync)
            const pushDataPayload: Record<string, any> = {
                history: historyRaw.filter(h => (h.updatedAt || 0) > lastSyncTime),
                routines: routinesRaw.filter(r => (r.updatedAt || 0) > lastSyncTime),
                exercises: rawExercises.filter(e => (e.updatedAt || 0) > lastSyncTime),
                // settings and profile are still blobs for now (logic can be expanded)
                settings: localStorage.getItem('settings') ? JSON.parse(localStorage.getItem('settings')!) : undefined,
                profile: localStorage.getItem('profile') ? JSON.parse(localStorage.getItem('profile')!) : undefined,
            };

            // 2. Push local changes
            const pushResult = await pushData(token, pushDataPayload);
            if (pushResult.error) return { success: false, error: pushResult.error };

            // 3. Pull remote changes
            const pullResult = await pullData(token, lastSyncTime);
            if (pullResult.error) return { success: false, error: pullResult.error };

            // 4. Merge incoming data (Last Write Wins)
            if (pullResult.data) {
                const remoteData = pullResult.data;

                // Merge History
                if (Array.isArray(remoteData.history)) {
                    setHistoryRaw(prev => {
                        const next = [...prev];
                        remoteData.history.forEach((remoteItem: WorkoutSession) => {
                            const idx = next.findIndex(l => l.id === remoteItem.id);
                            if (idx >= 0) {
                                if ((remoteItem.updatedAt || 0) > (next[idx].updatedAt || 0)) {
                                    next[idx] = remoteItem;
                                }
                            } else {
                                next.push(remoteItem);
                            }
                        });
                        return next;
                    });
                }

                // Merge Routines
                if (Array.isArray(remoteData.routines)) {
                    setRoutinesRaw(prev => {
                        const next = [...prev];
                        remoteData.routines.forEach((remoteItem: Routine) => {
                            const idx = next.findIndex(l => l.id === remoteItem.id);
                            if (idx >= 0) {
                                if ((remoteItem.updatedAt || 0) > (next[idx].updatedAt || 0)) {
                                    next[idx] = remoteItem;
                                }
                            } else {
                                next.push(remoteItem);
                            }
                        });
                        return next;
                    });
                }

                // Merge Exercises
                if (Array.isArray(remoteData.exercises)) {
                    setRawExercises(prev => {
                        const next = [...prev];
                        remoteData.exercises.forEach((remoteItem: Exercise) => {
                            const idx = next.findIndex(l => l.id === remoteItem.id);
                            if (idx >= 0) {
                                if ((remoteItem.updatedAt || 0) > (next[idx].updatedAt || 0)) {
                                    next[idx] = remoteItem;
                                }
                            } else {
                                next.push(remoteItem);
                            }
                        });
                        return next;
                    });
                }
            }

            setLastSyncTime(now);
            return { success: true };
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, error: 'Synchronization failed' };
        }
    }, [historyRaw, routinesRaw, rawExercises, setHistoryRaw, setRoutinesRaw, setRawExercises]);

    const value = useMemo(() => ({
        routines, upsertRoutine, upsertRoutines, deleteRoutine,
        exercises, rawExercises, setRawExercises, getExerciseById,
        history, saveCompletedWorkout, deleteHistorySession, updateHistorySession,
        allTimeBestSets, checkInState, handleCheckInResponse, importDataData, syncWithCloud
    }), [
        routines, upsertRoutine, upsertRoutines, deleteRoutine,
        exercises, rawExercises, setRawExercises, getExerciseById,
        history, saveCompletedWorkout, deleteHistorySession, updateHistorySession,
        allTimeBestSets, checkInState, handleCheckInResponse, importDataData, syncWithCloud
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
