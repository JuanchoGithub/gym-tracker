
import { WorkoutSession, Exercise, UserGoal, Profile } from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { MUSCLES } from '../constants/muscles';

const RECOVERY_TIMES: Record<string, number> = {
    [MUSCLES.ABS]: 24,
    [MUSCLES.FOREARMS]: 24,
    [MUSCLES.CALVES]: 48,
    [MUSCLES.BICEPS]: 48,
    [MUSCLES.TRICEPS]: 48,
    [MUSCLES.SIDE_DELTS]: 48,
    [MUSCLES.REAR_DELTS]: 48,
    [MUSCLES.ROTATOR_CUFF]: 48,
    [MUSCLES.PECTORALS]: 72,
    [MUSCLES.UPPER_CHEST]: 72,
    [MUSCLES.LOWER_CHEST]: 72,
    [MUSCLES.LATS]: 72,
    [MUSCLES.FRONT_DELTS]: 60,
    [MUSCLES.TRAPS]: 60,
    [MUSCLES.RHOMBOIDS]: 60,
    [MUSCLES.HIP_FLEXORS]: 60,
    [MUSCLES.ADDUCTORS]: 72,
    [MUSCLES.ABDUCTORS]: 72,
    [MUSCLES.QUADS]: 96,
    [MUSCLES.HAMSTRINGS]: 96,
    [MUSCLES.GLUTES]: 96,
    [MUSCLES.LOWER_BACK]: 96,
    [MUSCLES.SPINAL_ERECTORS]: 96,
};

const DEFAULT_RECOVERY_HOURS = 72;

/**
 * Calculates volume/minute for a session.
 */
export const calculateSessionDensity = (session: WorkoutSession): number => {
    if (session.endTime <= session.startTime) return 0;
    const durationMinutes = (session.endTime - session.startTime) / 60000;
    if (durationMinutes < 5) return 0;

    const totalVolume = session.exercises.reduce((acc, ex) => 
        acc + ex.sets.reduce((sAcc, s) => sAcc + (s.isComplete ? (s.weight * s.reps) : 0), 0)
    , 0);

    return totalVolume / durationMinutes;
};

/**
 * Calculates a rolling average density of previous sessions.
 */
export const calculateAverageDensity = (history: WorkoutSession[], limit: number = 10): number => {
    const densities = history.slice(0, limit).map(calculateSessionDensity).filter(d => d > 0);
    if (densities.length === 0) return 0;
    return densities.reduce((a, b) => a + b, 0) / densities.length;
};

export const getFreshnessColor = (score: number): string => {
    let hue = 0;
    if (score <= 20) {
        hue = (score / 20) * 10; 
    } else if (score <= 60) {
        hue = 10 + ((score - 20) / 40) * 50;
    } else {
        hue = 60 + ((score - 60) / 40) * 60;
    }
    return `hsl(${Math.round(hue)}, 85%, 45%)`;
};

export const calculateMuscleFreshness = (
    history: WorkoutSession[], 
    exercises: Exercise[], 
    userGoal: UserGoal = 'muscle',
    profile?: Profile
): Record<string, number> => {
    const freshness: Record<string, number> = {};
    const now = Date.now();
    const MS_PER_HOUR = 3600000;
    
    let capacityBaseline = 15;
    if (userGoal === 'strength') capacityBaseline = 10;
    if (userGoal === 'endurance') capacityBaseline = 20;

    const MAX_LOOKBACK = 6 * 24 * MS_PER_HOUR;
    const relevantHistory = history.filter(s => (now - s.startTime) < MAX_LOOKBACK);

    // Bio-Adaptive Modification: Efficiency Score
    // If the user's density in the last session was high, we "boost" recovery speed 
    // by slightly reducing the effective fatigue accumulated.
    let recoveryEfficiencyMult = 1.0;
    if (profile?.bioAdaptiveEngine && history.length >= 2) {
        const lastDensity = calculateSessionDensity(history[0]);
        const avgDensity = calculateAverageDensity(history.slice(1), 5);
        if (lastDensity > 0 && avgDensity > 0) {
            const ratio = lastDensity / avgDensity;
            // Cap efficiency boost at 20%
            recoveryEfficiencyMult = Math.max(0.8, Math.min(1.2, 1 / ratio));
        }
    }

    const muscleFatigueAccumulation: Record<string, number> = {};

    relevantHistory.forEach(session => {
        const hoursAgo = (now - session.startTime) / MS_PER_HOUR;

        session.exercises.forEach(ex => {
            const def = exercises.find(e => e.id === ex.exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === ex.exerciseId);
            if (!def) return;

            const stressUnits = ex.sets.reduce((acc, set) => {
                if (!set.isComplete) return acc;
                let intensityMult = 1.0;
                if (set.reps > 0 && set.reps <= 6) intensityMult = 1.65;
                else if (set.reps > 12) intensityMult = 0.8;
                if (set.type === 'failure') intensityMult += 0.3;
                if (set.type === 'drop') intensityMult += 0.1;
                if (set.type === 'warmup') intensityMult = 0.5;
                return acc + intensityMult;
            }, 0);

            if (stressUnits === 0) return;

            // Apply fatigue with adaptive multiplier
            const appliedStress = stressUnits * recoveryEfficiencyMult;

            def.primaryMuscles?.forEach(m => {
                const recoveryDuration = RECOVERY_TIMES[m] || DEFAULT_RECOVERY_HOURS;
                if (hoursAgo >= recoveryDuration) return;
                const timeFactor = 1 - (hoursAgo / recoveryDuration);
                const fatigue = (appliedStress / capacityBaseline) * 100 * timeFactor;
                muscleFatigueAccumulation[m] = (muscleFatigueAccumulation[m] || 0) + fatigue;
            });
            
            def.secondaryMuscles?.forEach(m => {
                const recoveryDuration = RECOVERY_TIMES[m] || DEFAULT_RECOVERY_HOURS;
                if (hoursAgo >= recoveryDuration) return;
                const timeFactor = 1 - (hoursAgo / recoveryDuration);
                const fatigue = ((appliedStress * 0.5) / capacityBaseline) * 100 * timeFactor; 
                muscleFatigueAccumulation[m] = (muscleFatigueAccumulation[m] || 0) + fatigue;
            });
        });
    });

    const allMuscles = Object.keys(muscleFatigueAccumulation);
    allMuscles.forEach(m => {
        const fatigue = muscleFatigueAccumulation[m];
        freshness[m] = Math.round(Math.max(0, 100 - fatigue));
    });

    return freshness;
};

export const calculateSystemicFatigue = (history: WorkoutSession[], exercises: Exercise[]): { score: number, level: 'Low' | 'Medium' | 'High' } => {
    const now = Date.now();
    const TWO_WEEKS = 14 * 24 * 3600 * 1000;
    const recent = history.filter(s => (now - s.startTime) < TWO_WEEKS);
    
    let fatiguePoints = 0;
    recent.forEach(s => {
        const daysAgo = (now - s.startTime) / (24 * 3600 * 1000);
        const decay = Math.max(0, 1 - (daysAgo / 10)); 
        let sessionCost = 5; 
        const sets = s.exercises.reduce((acc, ex) => acc + ex.sets.filter(set => set.isComplete).length, 0);
        let compoundFactor = 0;
        s.exercises.forEach(ex => {
            const def = exercises.find(e => e.id === ex.exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === ex.exerciseId);
            if (def && ['Barbell', 'Dumbbell'].includes(def.category) && ['Legs', 'Back', 'Chest'].includes(def.bodyPart)) {
                compoundFactor += 1;
            }
        });
        sessionCost += (sets * 1) + (compoundFactor * 2);
        fatiguePoints += sessionCost * decay;
    });
    
    const score = Math.min(100, Math.round((fatiguePoints / 150) * 100));
    let level: 'Low' | 'Medium' | 'High' = 'Low';
    if (score > 60) level = 'High';
    else if (score > 30) level = 'Medium';
    return { score, level };
};

export const calculateBurnoutAnalysis = (history: WorkoutSession[], exercises: Exercise[]): { currentLoad: number, maxLoad: number, trend: 'accumulating' | 'recovering' | 'stable', daysToBurnout?: number } => {
    const { score: currentLoad } = calculateSystemicFatigue(history, exercises);
    const now = Date.now();
    const oneWeek = 7 * 24 * 3600 * 1000;
    const week1History = history.filter(s => s.startTime > now - oneWeek);
    const week2History = history.filter(s => s.startTime <= now - oneWeek && s.startTime > now - 2 * oneWeek);
    const vol1 = week1History.length;
    const vol2 = week2History.length;
    
    let trend: 'accumulating' | 'recovering' | 'stable' = 'stable';
    if (vol1 > vol2 + 1) trend = 'accumulating';
    else if (vol1 < vol2 - 1) trend = 'recovering';
    
    let daysToBurnout = undefined;
    if (trend === 'accumulating' && currentLoad > 70) {
        daysToBurnout = Math.max(1, Math.round((100 - currentLoad) / 5)); 
    }
    
    return { currentLoad, maxLoad: 100, trend, daysToBurnout };
};
