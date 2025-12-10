
import { Routine, WorkoutSession, Exercise, WorkoutExercise, PerformedSet, MuscleGroup, UserGoal } from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { MUSCLES } from '../constants/muscles';
import { SurveyAnswers } from './routineGenerator';

// --- Configuration ---

const READINESS_THRESHOLDS = {
    beginner: { critical: 40, caution: 65 },
    intermediate: { critical: 30, caution: 55 },
    advanced: { critical: 20, caution: 45 }
};

// Muscle Groups for Systemic Calculation
const MAJOR_MOVERS = {
    LEGS: [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES],
    BACK: [MUSCLES.LATS, MUSCLES.LOWER_BACK, MUSCLES.TRAPS],
    PUSH: [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS],
    CORE: [MUSCLES.ABS, MUSCLES.OBLIQUES]
};

// Exercise Categories for Logic
const EX_TYPES = {
    MOBILITY: ['Mobility'],
    CORE: ['Core'],
    CARDIO_LOW: ['Cycling (Stationary)', 'Walking', 'Elliptical'],
    CARDIO_HIGH: ['Burpee', 'Jump Rope', 'Box Jump', 'Sprints', 'Running'],
    METCON_UPPER: ['Battle Rope', 'Medicine Ball Slam', 'Rowing (Machine)'],
    METCON_LOWER: ['Kettlebell Swing', 'Sled Push', 'High Knees']
};

// Helper to create a set
const createSet = (type: 'normal' | 'timed', val: number): PerformedSet => ({
    id: `set-gen-${Math.random().toString(36).substr(2, 9)}`,
    reps: type === 'normal' ? val : 0,
    weight: 0,
    time: type === 'timed' ? val : undefined,
    type,
    isComplete: false,
});

// Helper to create an exercise entry
const createGapExercise = (exerciseId: string, isTimed: boolean, sets: number, durationOrReps: number): WorkoutExercise => {
    const setList = Array.from({ length: sets }, () => 
        createSet(isTimed ? 'timed' : 'normal', durationOrReps)
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
 * Calculates a Systemic Readiness Score (0-100) based on weighted freshness of major muscle groups.
 * Lower score means higher systemic fatigue.
 */
export const calculateSystemicReadiness = (freshness: Record<string, number>): number => {
    const getAvg = (muscles: string[]) => {
        const scores = muscles.map(m => freshness[m] ?? 100);
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    };

    const legsScore = getAvg(MAJOR_MOVERS.LEGS);
    const backScore = getAvg(MAJOR_MOVERS.BACK);
    const pushScore = getAvg(MAJOR_MOVERS.PUSH);
    
    // Weights: Legs (40%), Back (30%), Push (30%) - Legs tax CNS the most
    return Math.round((legsScore * 0.4) + (backScore * 0.3) + (pushScore * 0.3));
};

/**
 * Predicts the next routine the user is likely to perform based on history patterns.
 */
export const predictNextRoutine = (history: WorkoutSession[], routines: Routine[]): Routine | null => {
    if (history.length < 2) return null;

    const lastRoutineId = history[0].routineId;
    const historyIds = history.map(h => h.routineId);

    const prevIndex = historyIds.indexOf(lastRoutineId, 1);

    if (prevIndex !== -1 && prevIndex > 1) {
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
            def.primaryMuscles.forEach(m => protectedSet.add(m));
        }
    });
    return Array.from(protectedSet);
};

/**
 * The Dynamic Conditioning Engine.
 * Generates a session tailored to the user's fatigue state, goal, and equipment.
 */
export const generateGapSession = (
    protectedMuscles: MuscleGroup[], 
    allExercises: Exercise[],
    history: WorkoutSession[],
    t: (key: string, params?: any) => string,
    userProfile: SurveyAnswers,
    freshnessMap: Record<string, number>
): Routine => {
    
    const { experience, goal, equipment, time } = userProfile;
    const systemicScore = calculateSystemicReadiness(freshnessMap);
    const thresholds = READINESS_THRESHOLDS[experience] || READINESS_THRESHOLDS.intermediate;

    // 1. Determine Readiness Zone
    let zone: 'critical' | 'caution' | 'go' = 'go';
    if (systemicScore < thresholds.critical) zone = 'critical';
    else if (systemicScore < thresholds.caution) zone = 'caution';

    // 2. Configure Session Parameters based on Zone
    let sessionTitle = t('smart_recovery_mode');
    let sessionDesc = '';
    let intensity = 'low';
    let volumeScale = 1.0;
    
    if (zone === 'critical') {
        sessionTitle = t('coach_routine_cns_reset_title');
        sessionDesc = t('coach_routine_cns_reset_desc', { score: systemicScore });
        intensity = 'lowest';
        volumeScale = 0.5;
    } else if (zone === 'caution') {
        sessionTitle = t('coach_routine_metabolic_title');
        sessionDesc = t('coach_routine_metabolic_desc', { score: systemicScore });
        intensity = 'medium';
        volumeScale = 0.75; // Cap volume
    } else {
        sessionTitle = t('coach_routine_active_recovery_title');
        sessionDesc = t('coach_routine_active_recovery_desc');
        intensity = 'high';
        volumeScale = 1.0;
    }

    // Adjust volume by time preference
    if (time === 'short') volumeScale *= 0.7;
    if (time === 'long') volumeScale *= 1.3;

    // 3. Filter Exercise Pool
    // Filter out exercises that use muscles in Critical Zone (< threshold.critical)
    const criticalMuscles = Object.entries(freshnessMap)
        .filter(([_, score]) => score < thresholds.critical)
        .map(([m]) => m);
    
    // Also respect protected muscles (from next workout)
    const excludedMuscles = new Set([...criticalMuscles, ...protectedMuscles]);

    const candidates = allExercises.filter(ex => {
        // Equipment Check
        if (equipment === 'bodyweight' && !['Bodyweight', 'Assisted Bodyweight', 'Cardio', 'Plyometrics', 'Duration'].includes(ex.category)) return false;
        if (equipment === 'dumbbell' && ['Barbell', 'Machine', 'Cable', 'Smith Machine'].includes(ex.category)) return false;

        // Muscle Check (Primary)
        if (ex.primaryMuscles?.some(m => excludedMuscles.has(m))) return false;
        
        // Zone constraints
        if (zone === 'critical') {
             // Only Mobility and very light core
             return ex.bodyPart === 'Mobility' || (ex.bodyPart === 'Core' && !ex.name.includes('Weighted'));
        }
        
        if (zone === 'caution') {
            // No Plyometrics, No heavy compounds
            if (ex.category === 'Plyometrics') return false;
            if (ex.category === 'Barbell' && ['Legs', 'Back'].includes(ex.bodyPart)) return false;
        }

        return true;
    });

    // 4. Select Exercises based on Strategy
    const selectedExercises: WorkoutExercise[] = [];
    
    const addExercise = (pool: Exercise[], count: number, sets: number, repsOrTime: number, isTimed: boolean) => {
        if (pool.length === 0) return;
        // Shuffle and pick
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        // Deduplicate
        const unique = shuffled.filter(p => !selectedExercises.some(se => se.exerciseId === p.id));
        
        unique.slice(0, count).forEach(ex => {
            selectedExercises.push(createGapExercise(ex.id, isTimed, sets, repsOrTime));
        });
    };

    // Strategy Implementation
    if (zone === 'critical') {
        // CNS RESET: Mobility + Light Core
        const mobility = candidates.filter(ex => ex.bodyPart === 'Mobility' || ex.category === 'Duration');
        const core = candidates.filter(ex => ex.bodyPart === 'Core');
        
        // Structure: 2-3 Mobility, 1 Core
        const mobCount = Math.round(3 * volumeScale);
        addExercise(mobility, mobCount, 2, 45, true); // 2 sets of 45s
        addExercise(core, 1, 2, 30, true); // Light core
        
    } else {
        // CAUTION or GO ZONE
        // Decide archetype based on Goal
        if (goal === 'endurance') {
            // METCON / HIIT Style
            const cardio = candidates.filter(ex => ex.category === 'Cardio');
            const fullBody = candidates.filter(ex => ex.bodyPart === 'Full Body' || ex.category === 'Kettlebell' || ex.name.includes('Rope') || ex.name.includes('Swing'));
            const core = candidates.filter(ex => ex.bodyPart === 'Core');
            
            const rounds = Math.max(2, Math.round(4 * volumeScale));
            
            // Warmup
            const mobility = allExercises.filter(ex => ex.bodyPart === 'Mobility').slice(0, 5); // Allow any mobility for warmup
            addExercise(mobility, 1, 1, 60, true);

            // Main Block
            if (zone === 'caution') {
                // Low Impact
                const lowImpact = [...cardio, ...fullBody].filter(ex => !ex.name.includes('Jump') && !ex.name.includes('Burpee'));
                addExercise(lowImpact, 3, rounds, 45, true); // 45s work
            } else {
                // High Intensity
                const hiitPool = [...cardio, ...fullBody];
                addExercise(hiitPool, 3, rounds, 30, true); // 30s work
            }
            
            // Finisher
            addExercise(core, 1, 3, 20, false); // 20 reps

        } else {
            // STRENGTH / MUSCLE / MAINTAIN
            // Active Recovery Flow (Iso + Core + Mobility)
            const mobility = candidates.filter(ex => ex.bodyPart === 'Mobility');
            const core = candidates.filter(ex => ex.bodyPart === 'Core');
            const isos = candidates.filter(ex => !['Mobility', 'Core', 'Cardio', 'Full Body'].includes(ex.bodyPart));
            
            const sets = Math.max(2, Math.round(3 * volumeScale));
            
            // Structure: 1 Mobility -> 1 Core -> 2 Isos -> 1 Mobility
            addExercise(mobility, 1, 1, 60, true); // Opener
            addExercise(core, 1, sets, 15, false);
            addExercise(isos, 2, sets, 15, false); // Light pump work (15 reps)
            addExercise(mobility, 1, 1, 60, true); // Closer
        }
    }

    // Fallback if filtering was too aggressive
    if (selectedExercises.length === 0) {
        // Fallback to pure mobility using ALL exercises (ignoring muscle fatigue for gentle stretching)
        const allMobility = allExercises.filter(ex => ex.bodyPart === 'Mobility');
        addExercise(allMobility, 3, 1, 60, true);
        sessionTitle += " (Fallback)";
    }

    return {
        id: `gap-${Date.now()}`,
        name: sessionTitle,
        description: sessionDesc,
        exercises: selectedExercises,
        isTemplate: false,
        routineType: (goal === 'endurance') && zone !== 'critical' ? 'hiit' : 'strength',
        tags: ['gap_session', 'recovery', 'generated', zone],
        hiitConfig: (goal === 'endurance') && zone !== 'critical' ? {
            workTime: zone === 'caution' ? 45 : 30,
            restTime: zone === 'caution' ? 30 : 30,
            prepareTime: 10
        } : undefined
    };
};
