
import { Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, MuscleGroup } from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { MUSCLES } from '../constants/muscles';
import { calculateNormalizedStrengthScores } from '../services/analyticsService';

// Helper to create a simple set
const createRecoverySet = (reps: number, time?: number): PerformedSet => ({
    id: `set-gap-${Math.random().toString(36).substr(2, 9)}`,
    reps,
    weight: 0,
    time,
    type: time ? 'timed' : 'normal',
    isComplete: false,
});

// Helper to create an exercise entry
const createGapExercise = (exerciseId: string, isTimed: boolean, sets: number = 2): WorkoutExercise => {
    const setList = Array.from({ length: sets }, () => 
        isTimed ? createRecoverySet(1, 45) : createRecoverySet(15)
    );

    return {
        id: `we-gap-${Math.random().toString(36).substr(2, 9)}`,
        exerciseId,
        sets: setList,
        restTime: {
            normal: 45,
            warmup: 30,
            drop: 30,
            timed: 10,
            effort: 60,
            failure: 90,
        },
    };
};

/**
 * Predicts the next routine the user is likely to perform based on history patterns.
 * Look for A -> B -> C -> A patterns.
 */
export const predictNextRoutine = (history: WorkoutSession[], routines: Routine[]): Routine | null => {
    if (history.length < 2) return null;

    const lastRoutineId = history[0].routineId;
    const historyIds = history.map(h => h.routineId);

    // Find the previous occurrence of the last routine
    // history[0] is current last. Start searching from index 1.
    const prevIndex = historyIds.indexOf(lastRoutineId, 1);

    if (prevIndex !== -1 && prevIndex > 1) {
        // The routine *before* the previous occurrence of 'lastRoutineId' in the array
        // (which corresponds to the workout done *after* that previous occurrence in time)
        // Array: [Current(A), Previous(C), ..., Old(A), OldPrev(B)]
        // We want the one at index `prevIndex - 1`.
        const predictedId = historyIds[prevIndex - 1];
        return routines.find(r => r.id === predictedId) || null;
    }

    return null;
};

/**
 * Identifies primary muscles used in a routine to "protect" them.
 */
export const getProtectedMuscles = (routine: Routine, allExercises: Exercise[]): MuscleGroup[] => {
    const protectedSet = new Set<MuscleGroup>();
    
    routine.exercises.forEach(we => {
        const def = allExercises.find(e => e.id === we.exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === we.exerciseId);
        if (def && def.primaryMuscles) {
            // Only protect if it's a compound movement (Barbell, Dumbbell, Machine) mostly
            // We always protect primary movers of the predicted heavy workout.
            def.primaryMuscles.forEach(m => protectedSet.add(m));
        }
    });

    return Array.from(protectedSet);
};

// Accessory Muscles mapping for each major lift pattern
const LIFT_ACCESSORIES: Record<string, MuscleGroup[]> = {
    SQUAT: [MUSCLES.ADDUCTORS, MUSCLES.ABS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES],
    DEADLIFT: [MUSCLES.LOWER_BACK, MUSCLES.GLUTES, MUSCLES.FOREARMS, MUSCLES.TRAPS],
    BENCH: [MUSCLES.TRICEPS, MUSCLES.ROTATOR_CUFF, MUSCLES.FRONT_DELTS, MUSCLES.UPPER_CHEST],
    OHP: [MUSCLES.TRICEPS, MUSCLES.SIDE_DELTS, MUSCLES.ABS, MUSCLES.TRAPS],
    ROW: [MUSCLES.BICEPS, MUSCLES.REAR_DELTS, MUSCLES.RHOMBOIDS],
    VERTICAL_PULL: [MUSCLES.BICEPS, MUSCLES.LATS, MUSCLES.FOREARMS]
};

/**
 * Generates a "Gap Session" (Active Recovery) that avoids protected muscles
 * and focuses on Mobility, Core, and non-fatiguing isolation work.
 * Now prioritizes weak points and scales duration!
 */
export const generateGapSession = (
    protectedMuscles: MuscleGroup[], 
    allExercises: Exercise[],
    history: WorkoutSession[],
    t: (key: string) => string,
    equipmentProfile: 'gym' | 'dumbbell' | 'bodyweight' = 'gym',
    durationProfile: 'short' | 'medium' | 'long' = 'medium'
): Routine => {
    
    // 0. Configure Volume based on Duration Profile
    let config = { sets: 3, isoCount: 2, cardio: true };
    if (durationProfile === 'short') {
        config = { sets: 2, isoCount: 1, cardio: false }; // ~20-30m
    } else if (durationProfile === 'long') {
        config = { sets: 3, isoCount: 3, cardio: true }; // ~60m+
    }

    // 1. Calculate Weak Points
    const scores = calculateNormalizedStrengthScores(history);
    // Find the pattern with the lowest non-zero score (or zero if untrained)
    const sortedWeaknesses = Object.entries(scores)
        .filter(([_, score]) => score > 0) 
        .sort((a, b) => a[1] - b[1]);
    
    const weakestLift = sortedWeaknesses.length > 0 ? sortedWeaknesses[0][0] : null;
    const weakPointMuscles = weakestLift ? LIFT_ACCESSORIES[weakestLift] : [];
    
    // 2. Filter Candidate Exercises
    const candidates = allExercises.filter(ex => {
        // Exclude heavy CNS loading categories
        if (ex.category === 'Barbell' || ex.category === 'Plyometrics') return false;

        // Exclude if it hits protected muscles
        if (ex.primaryMuscles?.some(m => protectedMuscles.includes(m))) return false;
        
        // Equipment Check
        if (equipmentProfile === 'bodyweight') {
             if (!['Bodyweight', 'Assisted Bodyweight', 'Cardio', 'Duration', 'Reps Only'].includes(ex.category)) return false;
        } else if (equipmentProfile === 'dumbbell') {
             // Allow Dumbbells, Kettlebells, and all bodyweight stuff. Exclude machines/cables/barbells.
             if (['Barbell', 'Machine', 'Cable'].includes(ex.category)) return false;
        }

        return true;
    });

    // 3. Select Categories
    const selectedExercises: WorkoutExercise[] = [];
    
    // A. Mobility (Always include 1)
    const mobility = candidates.filter(ex => ex.bodyPart === 'Mobility' || ex.category === 'Duration');
    if (mobility.length > 0) {
        const randomMobility = mobility[Math.floor(Math.random() * mobility.length)];
        selectedExercises.push(createGapExercise(randomMobility.id, !!randomMobility.isTimed, config.sets));
    }

    // B. Core (Always include 1)
    const core = candidates.filter(ex => ex.bodyPart === 'Core');
    if (core.length > 0) {
        const randomCore = core[Math.floor(Math.random() * core.length)];
        selectedExercises.push(createGapExercise(randomCore.id, !!randomCore.isTimed, config.sets));
    }
    
    // C. Isolation / Accessory (Pick based on config.isoCount)
    const others = candidates.filter(ex => ex.bodyPart !== 'Mobility' && ex.bodyPart !== 'Core' && ex.bodyPart !== 'Cardio');
    
    const weakPointCandidates = others.filter(ex => 
        ex.primaryMuscles?.some(m => weakPointMuscles.includes(m))
    );
    
    const genericCandidates = others.filter(ex => 
        !ex.primaryMuscles?.some(m => weakPointMuscles.includes(m))
    );

    // Helper to add unique exercises
    const addUniqueExercise = (pool: Exercise[]) => {
        if (pool.length === 0) return;
        // Try to pick one not already selected (by checking IDs in selectedExercises)
        const available = pool.filter(p => !selectedExercises.some(se => se.exerciseId === p.id));
        if (available.length > 0) {
            const picked = available[Math.floor(Math.random() * available.length)];
            selectedExercises.push(createGapExercise(picked.id, !!picked.isTimed, config.sets));
        }
    };

    // Fill Iso Slots
    for (let i = 0; i < config.isoCount; i++) {
        // Priority: Weak points -> Generics
        if (weakPointCandidates.length > 0 && Math.random() > 0.3) { // 70% chance to pick weak point if available
             addUniqueExercise(weakPointCandidates);
        } else {
             addUniqueExercise(genericCandidates);
        }
    }
    
    // D. Cardio (Optional low impact)
    if (config.cardio) {
        const cardio = candidates.filter(ex => ex.category === 'Cardio');
        if (cardio.length > 0) {
             const randomCardio = cardio[Math.floor(Math.random() * cardio.length)];
             selectedExercises.push(createGapExercise(randomCardio.id, true, 1)); // Usually just 1 long set or interval
        }
    }

    return {
        id: `gap-${Date.now()}`,
        name: t('rec_type_gap_title'),
        description: weakestLift 
            ? `${t('rec_type_gap_desc')} Targeting: ${weakestLift.toLowerCase()} accessory muscles.` 
            : t('rec_type_gap_desc'),
        exercises: selectedExercises,
        isTemplate: false,
        routineType: 'strength',
        tags: ['gap_session', 'recovery']
    };
};
