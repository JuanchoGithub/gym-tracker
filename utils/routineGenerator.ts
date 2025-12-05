
import { Routine, WorkoutExercise, PerformedSet, Exercise, BodyPart, ExerciseCategory } from '../types';

export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SurveyAnswers {
  experience: RoutineLevel;
  goal: 'strength' | 'muscle' | 'endurance';
  equipment: 'gym' | 'dumbbell' | 'bodyweight';
  time: 'short' | 'medium' | 'long';
}

const createSet = (reps: number, type: 'normal' | 'warmup' | 'timed' = 'normal', time?: number): PerformedSet => ({
  id: `set-gen-${Math.random().toString(36).substr(2, 9)}`,
  reps,
  weight: 0,
  time,
  type,
  isComplete: false,
});

const createExercise = (exerciseId: string, sets: number, reps: number, rest: number, time?: number): WorkoutExercise => {
    const setList = Array.from({ length: sets }, () => createSet(reps, time ? 'timed' : 'normal', time));
    return {
        id: `we-gen-${Math.random().toString(36).substr(2, 9)}`,
        exerciseId,
        sets: setList,
        restTime: {
            normal: rest,
            warmup: 60,
            drop: 30,
            timed: 10,
            effort: rest * 2,
            failure: rest * 3,
        },
    };
};

// --- Exercise Maps (Slots -> Exercise IDs) ---
// Note: IDs must match constants/exercises.ts
// These maps act as the Default / Fallback if no history exists.
const EXERCISE_MAP = {
  gym: {
    chest_compound: 'ex-1', // Bench Press
    chest_iso: 'ex-26', // Pec Deck
    back_vertical: 'ex-10', // Lat Pulldown
    back_horizontal: 'ex-5', // Barbell Row
    shoulder_press: 'ex-4', // Overhead Press
    shoulder_iso: 'ex-56', // Lateral Raise
    legs_quad: 'ex-2', // Squat
    legs_ham: 'ex-16', // Leg Curl (Machine)
    legs_iso: 'ex-17', // Leg Ext
    tricep: 'ex-85', // Pushdown
    bicep: 'ex-7', // BB Curl
    core: 'ex-20', // Crunches
  },
  dumbbell: {
    chest_compound: 'ex-12', // Incline DB Press (safer/common for home)
    chest_iso: 'ex-11', // DB Fly
    back_vertical: 'ex-40', // Single Arm Row (Vertical pull is hard with just DBs, usually subbed with rows or pullups if available, assume row variations)
    back_horizontal: 'ex-40', // Single Arm Row
    shoulder_press: 'ex-60', // Arnold Press
    shoulder_iso: 'ex-56', // Lateral Raise
    legs_quad: 'ex-109', // Goblet Squat
    legs_ham: 'ex-98', // RDL
    legs_iso: 'ex-99', // Lunge
    tricep: 'ex-86', // Overhead Ext
    bicep: 'ex-13', // DB Curl
    core: 'ex-117', // Russian Twist
  },
  bodyweight: {
    chest_compound: 'ex-23', // Push-up
    chest_iso: 'ex-24', // Dips (Chest focus)
    back_vertical: 'ex-6', // Pull Up (Assuming bar access, or door)
    back_horizontal: 'ex-42', // Inverted Row (Table)
    shoulder_press: 'ex-62', // Pike Push-up
    shoulder_iso: 'ex-129', // Jumping Jacks (Cardio/Shoulder warmup) - limited options. Or Pike hold.
    legs_quad: 'ex-160', // Air Squat
    legs_ham: 'ex-104', // Glute Bridge
    legs_iso: 'ex-162', // Lunge
    tricep: 'ex-89', // Bench Dip
    bicep: 'ex-50', // Chin up (if bar)
    core: 'ex-15', // Plank
  }
};

// Logical Definitions for each slot to enable dynamic matching
// Used to find user favorites that fit the biomechanical role.
const SLOT_CRITERIA: Record<string, (e: Exercise) => boolean> = {
    chest_compound: (e) => e.bodyPart === 'Chest' && ['Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Assisted Bodyweight'].includes(e.category) && !e.name.includes('Fly'),
    chest_iso: (e) => e.bodyPart === 'Chest' && (e.name.includes('Fly') || e.category === 'Cable' || e.category === 'Machine'),
    back_vertical: (e) => e.bodyPart === 'Back' && (e.name.includes('Pull') || e.name.includes('Chin') || e.name.includes('Lat') || e.name.includes('Down')),
    back_horizontal: (e) => e.bodyPart === 'Back' && (e.name.includes('Row')),
    shoulder_press: (e) => e.bodyPart === 'Shoulders' && e.name.includes('Press'),
    shoulder_iso: (e) => e.bodyPart === 'Shoulders' && (e.name.includes('Raise') || e.name.includes('Fly')),
    legs_quad: (e) => (e.bodyPart === 'Legs' || e.bodyPart === 'Full Body') && (e.name.includes('Squat') || e.name.includes('Lunge') || e.name.includes('Step') || e.name.includes('Press')),
    legs_ham: (e) => (e.bodyPart === 'Legs' || e.bodyPart === 'Back') && (e.name.includes('Deadlift') || e.name.includes('Curl') || e.name.includes('Hinge') || e.name.includes('Glute') || e.name.includes('Thrust')),
    legs_iso: (e) => e.bodyPart === 'Legs' && (e.category === 'Machine' || e.category === 'Cable') && !e.name.includes('Press') && !e.name.includes('Squat'),
    tricep: (e) => e.bodyPart === 'Triceps',
    bicep: (e) => e.bodyPart === 'Biceps',
    core: (e) => e.bodyPart === 'Core',
};

const getExerciseId = (
    slot: keyof typeof EXERCISE_MAP['gym'], 
    equipment: SurveyAnswers['equipment'], 
    experience: SurveyAnswers['experience'],
    allExercises?: Exercise[],
    exerciseFrequency?: Record<string, number>
): string => {
    // 1. Dynamic Resolution (The "Favorite Lift" Engine)
    // If we have history data and the full exercise list, try to find a user favorite.
    if (allExercises && exerciseFrequency) {
        const criteria = SLOT_CRITERIA[slot];
        if (criteria) {
            // Filter candidates based on slot criteria AND available equipment
            const candidates = allExercises.filter(ex => {
                // Check biomechanical fit
                if (!criteria(ex)) return false;

                // Check equipment constraints
                if (equipment === 'bodyweight') {
                    if (!['Bodyweight', 'Assisted Bodyweight', 'Cardio', 'Plyometrics', 'Reps Only'].includes(ex.category)) return false;
                } else if (equipment === 'dumbbell') {
                    if (['Barbell', 'Machine', 'Cable', 'Smith Machine'].includes(ex.category)) return false;
                }
                // 'gym' allows everything

                return true;
            });

            // Sort by frequency
            candidates.sort((a, b) => (exerciseFrequency[b.id] || 0) - (exerciseFrequency[a.id] || 0));

            // If the user has done the top candidate at least 3 times, use it.
            // This threshold ensures we don't pick a random one-off exercise over a solid default.
            if (candidates.length > 0) {
                const bestCandidate = candidates[0];
                if ((exerciseFrequency[bestCandidate.id] || 0) >= 3) {
                    return bestCandidate.id;
                }
            }
        }
    }

    // 2. Fallback to Static Map
    const map = EXERCISE_MAP[equipment];
    const originalId = map[slot] || EXERCISE_MAP['gym'][slot];

    // Safety Swaps for Beginners (Overrides defaults)
    if (experience === 'beginner') {
        if (equipment === 'gym') {
            switch (originalId) {
                case 'ex-1': return 'ex-31'; // Bench Press -> Machine Chest Press
                case 'ex-2': return 'ex-109'; // Barbell Squat -> Goblet Squat
                case 'ex-5': return 'ex-38'; // Barbell Row -> Seated Cable Row
                case 'ex-4': return 'ex-67'; // OHP -> Machine Shoulder Press
                case 'ex-6': return 'ex-10'; // Pull Up -> Lat Pulldown
                case 'ex-98': return 'ex-16'; // RDL -> Leg Curl (Machine)
                case 'ex-24': return 'ex-89'; // Dips -> Bench Dips
            }
        }
        if (equipment === 'dumbbell') {
            switch (originalId) {
                case 'ex-98': return 'ex-104'; // RDL -> Glute Bridge
            }
        }
        if (equipment === 'bodyweight') {
            switch (originalId) {
                case 'ex-6': return 'ex-42'; // Pull Up -> Inverted Row (Easier to scale)
                case 'ex-24': return 'ex-89'; // Dips -> Bench Dips
            }
        }
    }

    return originalId;
};

export type RoutineFocus = 'push' | 'pull' | 'legs' | 'full_body' | 'upper' | 'lower' | 'cardio';

// Helper to satisfy type requirement for t argument
type TranslateFunc = (key: string, replacements?: Record<string, string | number>) => string;

export const generateSmartRoutine = (
  focus: RoutineFocus, 
  settings: SurveyAnswers, 
  t: TranslateFunc,
  allExercises?: Exercise[],
  exerciseFrequency?: Record<string, number>
): Routine => {
    const { goal, equipment, time, experience } = settings;
    
    // Tuning Parameters based on inferred or provided settings
    let sets = 3;
    let reps = 10;
    let rest = 60;

    if (goal === 'strength') {
        sets = 5;
        reps = 5;
        rest = 180;
    } else if (goal === 'endurance') {
        sets = 3;
        reps = 15;
        rest = 45;
    }

    if (time === 'short') {
        sets = Math.max(2, sets - 1);
        rest = Math.max(30, rest - 30);
    }

    const exercises: WorkoutExercise[] = [];
    const slots: (keyof typeof EXERCISE_MAP['gym'])[] = [];

    // Define slots based on focus
    switch (focus) {
        case 'push':
            slots.push('chest_compound', 'shoulder_press', 'chest_iso', 'shoulder_iso', 'tricep');
            break;
        case 'pull':
            slots.push('back_vertical', 'back_horizontal', 'legs_ham', 'bicep'); // Hamstrings often in pull
            break;
        case 'legs':
            slots.push('legs_quad', 'legs_ham', 'legs_iso', 'core');
            break;
        case 'upper':
            slots.push('chest_compound', 'back_vertical', 'shoulder_press', 'back_horizontal', 'bicep', 'tricep');
            break;
        case 'lower':
            slots.push('legs_quad', 'legs_ham', 'legs_iso', 'core');
            break;
        case 'full_body':
        default:
            slots.push('legs_quad', 'chest_compound', 'back_horizontal', 'core');
            break;
    }

    slots.forEach(slot => {
        const id = getExerciseId(slot, equipment, experience, allExercises, exerciseFrequency);
        // Special case for core/plank which is timed
        const isTimed = id === 'ex-15'; // Plank
        const finalReps = isTimed ? 1 : reps;
        const finalTime = isTimed ? (goal === 'strength' ? 60 : 45) : undefined;
        
        exercises.push(createExercise(id, sets, finalReps, rest, finalTime));
    });
    
    const localizedFocus = t(`focus_${focus}`);
    
    return {
        id: `smart-${focus}-${Date.now()}`,
        name: t('smart_routine_name', { focus: localizedFocus }),
        description: t('smart_routine_desc', { focus: localizedFocus }),
        exercises,
        isTemplate: false, // It's a generated session, not necessarily a saved template yet
        routineType: 'strength',
    };
}

export const generateRoutines = (answers: SurveyAnswers, t: TranslateFunc): Routine[] => {
    const { experience, goal, equipment, time } = answers;
    
    const routines: Routine[] = [];
    let routineCounter = 0;
    
    // Helper to wrap the smart generator but customize IDs and Names for onboarding
    const addRoutine = (nameKey: string, descKey: string, focus: RoutineFocus, freqDesc: string = "") => {
        // Note: For initial wizard, we don't pass exercise history so it uses defaults (Dynamic Resolution off)
        const routine = generateSmartRoutine(focus, answers, t);
        routineCounter++;
        routine.id = `gen-${Date.now()}-${routineCounter}-${Math.random().toString(36).substr(2, 9)}`;
        routine.name = t(nameKey);
        routine.description = `${t(descKey)} ${freqDesc}`;
        routine.isTemplate = true;
        routines.push(routine);
    };

    // --- Strategy Logic ---

    if (experience === 'beginner') {
        // Tuning Parameters (duplicated locally for this function scope to match original behavior)
        let sets = 3;
        let reps = 10;
        let rest = 60;
        if (goal === 'strength') { sets = 5; reps = 5; rest = 180; } 
        else if (goal === 'endurance') { sets = 3; reps = 15; rest = 45; }
        if (time === 'short') { sets = Math.max(2, sets - 1); rest = Math.max(30, rest - 30); }

        const createOnboardingRoutine = (nameKey: string, descKey: string, slots: (keyof typeof EXERCISE_MAP['gym'])[], freqDesc: string = "") => {
            const exercises: WorkoutExercise[] = [];
            slots.forEach(slot => {
                const id = getExerciseId(slot, equipment, experience);
                const isTimed = id === 'ex-15'; 
                const finalReps = isTimed ? 1 : reps;
                const finalTime = isTimed ? (goal === 'strength' ? 60 : 45) : undefined;
                exercises.push(createExercise(id, sets, finalReps, rest, finalTime));
            });
            routineCounter++;
            routines.push({
                id: `gen-${Date.now()}-${routineCounter}-${Math.random().toString(36).substr(2, 9)}`,
                name: t(nameKey),
                description: `${t(descKey)} ${freqDesc}`,
                exercises,
                isTemplate: true,
                routineType: 'strength',
            });
        };

        createOnboardingRoutine('wizard_routine_full_body_a_name', 'wizard_routine_full_body_a_desc', ['legs_quad', 'chest_compound', 'back_horizontal', 'core'], "");
        createOnboardingRoutine('wizard_routine_full_body_b_name', 'wizard_routine_full_body_b_desc', ['legs_ham', 'shoulder_press', 'back_vertical', 'tricep'], ""); 

    } else if (experience === 'intermediate') {
        addRoutine('wizard_routine_upper_name', 'wizard_routine_upper_desc', 'upper', "");
        addRoutine('wizard_routine_lower_name', 'wizard_routine_lower_desc', 'lower', "");
    } else {
        addRoutine('wizard_routine_push_name', 'wizard_routine_push_desc', 'push', "");
        addRoutine('wizard_routine_pull_name', 'wizard_routine_pull_desc', 'pull', "");
        addRoutine('wizard_routine_legs_name', 'wizard_routine_legs_desc', 'legs', "");
    }

    return routines;
};
