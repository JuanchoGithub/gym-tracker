
export interface ExerciseRatio {
    targetId: string;
    ratio: number;
}

export const PARENT_CHILD_EXERCISES: Record<string, ExerciseRatio[]> = {
    // Barbell Squat
    'ex-2': [
        { targetId: 'ex-101', ratio: 0.85 }, // Front Squat
        { targetId: 'ex-109', ratio: 0.50 }, // Goblet Squat
        { targetId: 'ex-9', ratio: 2.5 },    // Leg Press
        { targetId: 'ex-102', ratio: 1.1 },  // Hack Squat
    ],
    // Deadlift
    'ex-3': [
        { targetId: 'ex-98', ratio: 0.75 },  // RDL
        { targetId: 'ex-43', ratio: 1.1 },   // Rack Pull
    ],
    // Bench Press
    'ex-1': [
        { targetId: 'ex-12', ratio: 0.35 },  // Incline DB Press (Per hand)
        { targetId: 'ex-25', ratio: 0.8 },   // Incline Barbell
        { targetId: 'ex-11', ratio: 0.25 },  // DB Fly (Per hand)
        { targetId: 'ex-22', ratio: 1.05 },  // Decline Bench
        { targetId: 'ex-87', ratio: 0.9 },   // Close Grip Bench
    ],
    // Overhead Press
    'ex-4': [
        { targetId: 'ex-60', ratio: 0.35 },  // Arnold Press (Per hand)
        { targetId: 'ex-67', ratio: 1.1 },   // Machine Shoulder Press
    ],
};
