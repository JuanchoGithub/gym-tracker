
import { WorkoutSession, Exercise, UserGoal } from '../types';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { MUSCLES } from '../constants/muscles';

// Recovery times in hours for different muscle groups
// Smaller muscles recover faster (24-48h), larger systemic groups take longer (72-96h)
const RECOVERY_TIMES: Record<string, number> = {
    // Fast Recovery (24-48h)
    [MUSCLES.ABS]: 24,
    [MUSCLES.FOREARMS]: 24,
    [MUSCLES.CALVES]: 48,
    [MUSCLES.BICEPS]: 48,
    [MUSCLES.TRICEPS]: 48,
    [MUSCLES.SIDE_DELTS]: 48,
    [MUSCLES.REAR_DELTS]: 48,
    [MUSCLES.ROTATOR_CUFF]: 48,

    // Medium Recovery (60-72h)
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

    // Slow Recovery (Systemic load) (96h)
    [MUSCLES.QUADS]: 96,
    [MUSCLES.HAMSTRINGS]: 96,
    [MUSCLES.GLUTES]: 96,
    [MUSCLES.LOWER_BACK]: 96,
    [MUSCLES.SPINAL_ERECTORS]: 96,
};

const DEFAULT_RECOVERY_HOURS = 72;

export const getFreshnessColor = (score: number): string => {
    // RME Scale Mapping:
    // 0-20% Freshness (80-100% Fatigue) -> Red (Optimal Overload / Tired)
    // 20-60% Freshness (40-80% Fatigue) -> Orange/Yellow (Effective Training / Recovering)
    // 60-100% Freshness (0-40% Fatigue) -> Green (Fresh)
    
    let hue = 0;
    if (score <= 20) {
        // Deep Red to Red
        hue = (score / 20) * 10; 
    } else if (score <= 60) {
        // Red-Orange to Yellow (10 -> 60)
        hue = 10 + ((score - 20) / 40) * 50;
    } else {
        // Yellow to Green (60 -> 120)
        hue = 60 + ((score - 60) / 40) * 60;
    }
    
    return `hsl(${Math.round(hue)}, 85%, 45%)`;
};

export const calculateMuscleFreshness = (
    history: WorkoutSession[], 
    exercises: Exercise[], 
    userGoal: UserGoal = 'muscle'
): Record<string, number> => {
    const freshness: Record<string, number> = {};
    const now = Date.now();
    const MS_PER_HOUR = 3600000;
    
    // Determine Capacity Baseline (Sets per muscle group for full recovery/saturation)
    // Powerbuilder (Strength): Lower volume tolerance, higher intensity focus (~10 sets)
    // Bodybuilder (Muscle): Moderate volume tolerance (~15 sets)
    // Endurance: High volume tolerance (~20 sets)
    let capacityBaseline = 15;
    if (userGoal === 'strength') capacityBaseline = 10;
    if (userGoal === 'endurance') capacityBaseline = 20;

    // We analyze history up to the max recovery time (approx 5 days)
    const MAX_LOOKBACK = 5 * 24 * MS_PER_HOUR;
    const relevantHistory = history.filter(s => (now - s.startTime) < MAX_LOOKBACK);

    const muscleFatigueAccumulation: Record<string, number> = {};

    relevantHistory.forEach(session => {
        const hoursAgo = (now - session.startTime) / MS_PER_HOUR;

        session.exercises.forEach(ex => {
            const def = exercises.find(e => e.id === ex.exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === ex.exerciseId);
            if (!def) return;

            // Calculate Effective Stress Units (RME Numerator)
            const stressUnits = ex.sets.reduce((acc, set) => {
                if (!set.isComplete) return acc;
                
                let intensityMult = 1.0;
                
                // Intensity Multiplier based on Rep Range (implied load)
                // Updated: Increased Heavy Load multiplier from 1.3 to 1.65 to better reflect CNS stress of 5x5
                if (set.reps > 0 && set.reps <= 6) intensityMult = 1.65; // Heavy Load
                else if (set.reps > 12) intensityMult = 0.8; // Light Load
                
                // Modifiers
                if (set.type === 'failure') intensityMult += 0.3; // Increased from 0.2
                if (set.type === 'drop') intensityMult += 0.1;
                if (set.type === 'warmup') intensityMult = 0.5;

                return acc + intensityMult;
            }, 0);

            if (stressUnits === 0) return;

            // Apply fatigue to Primary Muscles
            def.primaryMuscles?.forEach(m => {
                const recoveryDuration = RECOVERY_TIMES[m] || DEFAULT_RECOVERY_HOURS;
                
                if (hoursAgo >= recoveryDuration) return;

                // Linear decay
                const timeFactor = 1 - (hoursAgo / recoveryDuration);
                
                // Fatigue % = (Stress / Capacity) * 100 * decay
                const fatigue = (stressUnits / capacityBaseline) * 100 * timeFactor;
                
                muscleFatigueAccumulation[m] = (muscleFatigueAccumulation[m] || 0) + fatigue;
            });
            
            // Apply fatigue to Secondary Muscles (Reduced impact)
            def.secondaryMuscles?.forEach(m => {
                const recoveryDuration = RECOVERY_TIMES[m] || DEFAULT_RECOVERY_HOURS;
                if (hoursAgo >= recoveryDuration) return;

                const timeFactor = 1 - (hoursAgo / recoveryDuration);
                // Secondary muscles take about 50% of the stress
                const fatigue = ((stressUnits * 0.5) / capacityBaseline) * 100 * timeFactor; 
                
                muscleFatigueAccumulation[m] = (muscleFatigueAccumulation[m] || 0) + fatigue;
            });
        });
    });

    // Convert accumulated fatigue to freshness (0-100)
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
        // CNS fatigue decays slower than muscle fatigue, roughly 7-10 days
        const decay = Math.max(0, 1 - (daysAgo / 10)); 
        
        // Base cost per session
        let sessionCost = 5; 
        
        // Add for volume/intensity
        const sets = s.exercises.reduce((acc, ex) => acc + ex.sets.filter(set => set.isComplete).length, 0);
        
        // Heuristic: More compounds = Higher CNS load
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
    
    // Normalize: >150 points in 10 days is extremely high
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
        // Rough estimate: how many days until load hits 100 at current pace
        daysToBurnout = Math.max(1, Math.round((100 - currentLoad) / 5)); 
    }
    
    return {
        currentLoad,
        maxLoad: 100,
        trend,
        daysToBurnout
    };
};
