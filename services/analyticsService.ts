
import { WorkoutSession, SupplementPlanItem, PerformedSet, Profile, Exercise, UserGoal } from '../types';
import { getDateString } from '../utils/timeUtils';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { SurveyAnswers } from '../utils/routineGenerator';
import { calculate1RM, getExerciseHistory } from '../utils/workoutUtils';
import { ANCHOR_EXERCISES, EXERCISE_RATIOS, BODY_PART_ANCHORS, CATEGORY_RATIOS } from '../constants/ratios';

export interface HabitData {
    exerciseFrequency: Record<string, number>;
    routineFrequency: Record<string, number>;
}

export const analyzeUserHabits = (history: WorkoutSession[]): HabitData => {
    const now = Date.now();
    // Analyze last 90 days for relevant habits
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(s => s.startTime > ninetyDaysAgo);

    const exerciseFrequency: Record<string, number> = {};
    const routineFrequency: Record<string, number> = {};

    recentHistory.forEach(session => {
        // Routine Frequency
        // Use routineId to track specific templates
        if (session.routineId) {
            routineFrequency[session.routineId] = (routineFrequency[session.routineId] || 0) + 1;
        }

        // Exercise Frequency
        session.exercises.forEach(ex => {
            exerciseFrequency[ex.exerciseId] = (exerciseFrequency[ex.exerciseId] || 0) + 1;
        });
    });

    return { exerciseFrequency, routineFrequency };
};

// Exercise IDs grouped by pattern for 1RM aggregation
export const MOVEMENT_PATTERNS = {
    SQUAT: ['ex-2', 'ex-101', 'ex-108', 'ex-109', 'ex-113', 'ex-160'],
    DEADLIFT: ['ex-3', 'ex-98', 'ex-43'],
    BENCH: ['ex-1', 'ex-11', 'ex-12', 'ex-22', 'ex-25', 'ex-28', 'ex-31', 'ex-34', 'ex-37'],
    OHP: ['ex-4', 'ex-60', 'ex-67', 'ex-68', 'ex-70'],
    ROW: ['ex-5', 'ex-38', 'ex-39', 'ex-40', 'ex-48'], // Horizontal Pull
    VERTICAL_PULL: ['ex-10', 'ex-50', 'ex-52', 'ex-6', 'ex-44'] // Vertical Pull (Pull Up, Lat Pulldown)
};

export const calculateMaxStrengthProfile = (history: WorkoutSession[], cutoffDate: number = Date.now()) => {
    const profile: Record<string, number> = {
        SQUAT: 0,
        DEADLIFT: 0,
        BENCH: 0,
        OHP: 0,
        ROW: 0,
        VERTICAL_PULL: 0
    };
    
    // Look at last 6 months from the cutoff date to ensure relevance
    const sixMonthsBeforeCutoff = cutoffDate - (180 * 24 * 60 * 60 * 1000);
    
    Object.entries(MOVEMENT_PATTERNS).forEach(([patternName, ids]) => {
        let maxE1RM = 0;
        
        ids.forEach(id => {
            const exHistory = getExerciseHistory(history, id);
            exHistory.forEach(entry => {
                // Ignore sessions that happened AFTER the cutoff date (future relative to snapshot)
                if (entry.session.startTime > cutoffDate) return;
                
                // Ignore sessions that are too old relative to the snapshot
                if (entry.session.startTime < sixMonthsBeforeCutoff) return;
                
                entry.exerciseData.sets.forEach(set => {
                    if (set.type === 'normal' && set.isComplete && set.reps <= 12) {
                         const e1rm = calculate1RM(set.weight, set.reps);
                         if (e1rm > maxE1RM) maxE1RM = e1rm;
                    }
                });
            });
        });
        
        profile[patternName] = maxE1RM;
    });

    return profile;
}

/**
 * Helper to find the anchor and ratio for any exercise (Tiered Lookup)
 */
export const resolveAnchorAndRatio = (exerciseId: string, allExercises: Exercise[]) => {
    // 1. Specific Mapping (Highest Accuracy)
    if (EXERCISE_RATIOS[exerciseId]) {
        return EXERCISE_RATIOS[exerciseId];
    }
    
    // 2. Fallback Mapping (Pattern Matching)
    // CRITICAL FIX: Always prefer PREDEFINED definition for structural properties (BodyPart/Category)
    // to ensure math works even if local storage has stale data for that ID.
    let exercise = PREDEFINED_EXERCISES.find(e => e.id === exerciseId);
    
    // If not a predefined exercise, look it up in the passed list (which contains custom ones)
    if (!exercise) {
        exercise = allExercises.find(e => e.id === exerciseId);
    }
    
    if (exercise) {
        const anchorId = BODY_PART_ANCHORS[exercise.bodyPart];
        const ratio = CATEGORY_RATIOS[exercise.category];
        
        if (anchorId && ratio) {
            return { anchorId, ratio };
        }
    }
    
    return null;
}

/**
 * Calculates "Synthetic Anchors" for the Big 4 based on all available history.
 * It normalizes accessory lifts to the main lift standard to find the user's theoretical max capabilities.
 */
export const calculateSyntheticAnchors = (history: WorkoutSession[], allExercises: Exercise[], profile?: Profile): Record<string, number> => {
    const anchors = {
        [ANCHOR_EXERCISES.SQUAT]: 0,
        [ANCHOR_EXERCISES.BENCH]: 0,
        [ANCHOR_EXERCISES.DEADLIFT]: 0,
        [ANCHOR_EXERCISES.OHP]: 0,
    };
    
    // 1. Initialize with stored profile maxes if available
    if (profile?.oneRepMaxes) {
        Object.values(ANCHOR_EXERCISES).forEach(anchorId => {
            if (profile.oneRepMaxes?.[anchorId]) {
                anchors[anchorId] = profile.oneRepMaxes[anchorId].weight;
            }
        });
    }

    // 2. Analyze History for "Best Fit" maxes
    // Iterate through all exercises in history. If an exercise is mapped to an anchor,
    // calculate its e1RM, normalize it, and update the anchor if it's higher.
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);

    history.forEach(session => {
        if (session.startTime < sixMonthsAgo) return;

        session.exercises.forEach(ex => {
            // Resolve ratio for this specific exercise instance
            const ratioData = resolveAnchorAndRatio(ex.exerciseId, allExercises);
            
            // Also check if it IS an anchor itself
            const isAnchor = Object.values(ANCHOR_EXERCISES).includes(ex.exerciseId);

            if (!ratioData && !isAnchor) return;

            // If it IS an anchor, ratio is 1.0 by definition
            const anchorId = ratioData ? ratioData.anchorId : ex.exerciseId;
            const ratio = ratioData ? ratioData.ratio : 1.0;

            // Find best set in this exercise instance
            let maxSetE1RM = 0;
            ex.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete && set.weight > 0 && set.reps > 0 && set.reps <= 12) {
                    // Only consider sets < 12 reps for accurate strength projection
                     const e1rm = calculate1RM(set.weight, set.reps);
                     if (e1rm > maxSetE1RM) maxSetE1RM = e1rm;
                }
            });

            if (maxSetE1RM > 0) {
                // Normalize: If I Leg Press 250kg (Ratio 2.5), my Theoretical Squat is 100kg.
                const normalizedMax = maxSetE1RM / ratio;
                
                // Update Anchor if this performance implies a higher strength level
                if (anchors[anchorId] !== undefined && normalizedMax > anchors[anchorId]) {
                    anchors[anchorId] = normalizedMax;
                }
            }
        });
    });

    return anchors;
};

/**
 * Infers the 1RM for a specific exercise based on Synthetic Anchors.
 */
export const getInferredMax = (exercise: Exercise, syntheticAnchors: Record<string, number>, allExercises: Exercise[]): { value: number, source: string } | null => {
    // 1. Is this exercise an Anchor itself?
    if (Object.values(ANCHOR_EXERCISES).includes(exercise.id)) {
        const val = syntheticAnchors[exercise.id];
        return val > 0 ? { value: val, source: 'History' } : null; // 'History' here essentially means calculated aggregate
    }

    // 2. Is it a mapped accessory?
    const mapping = resolveAnchorAndRatio(exercise.id, allExercises);
    
    if (mapping) {
        const anchorMax = syntheticAnchors[mapping.anchorId];
        if (anchorMax > 0) {
            const inferred = anchorMax * mapping.ratio;
            // Find Anchor Name for source label
            // Try to find in passed list first, then fallback to PREDEFINED to ensure we find name
            let anchorExercise = allExercises.find(e => e.id === mapping.anchorId);
            if (!anchorExercise) {
                anchorExercise = PREDEFINED_EXERCISES.find(e => e.id === mapping.anchorId);
            }
            
            const anchorName = anchorExercise?.name || 'Anchor';
            return { value: inferred, source: anchorName };
        }
    }

    return null;
};

export interface WeightSuggestion {
    weight: number;
    reason: string;
    trend: 'increase' | 'decrease' | 'maintain';
}

/**
 * Plate Detective: Infers the minimum plate increment based on history.
 */
const detectPreferredIncrement = (historyEntries: { exerciseData: { sets: PerformedSet[] } }[]): number => {
    // Collect all weights used
    const weights = new Set<number>();
    historyEntries.slice(0, 5).forEach(entry => {
        entry.exerciseData.sets.forEach(s => {
            if (s.weight > 0) weights.add(s.weight);
        });
    });

    if (weights.size < 2) return 2.5; // Default

    // Analyze divisibility
    let allDivisibleBy5 = true;
    weights.forEach(w => {
        if (w % 5 !== 0) allDivisibleBy5 = false;
    });

    return allDivisibleBy5 ? 5 : 2.5;
};

/**
 * Silent RPE: Infers effort based on rest times and set completion.
 */
const analyzePerformance = (lastSession: { exerciseData: { sets: PerformedSet[] }, session: WorkoutSession }, targetRest: number): 'good' | 'hard' | 'failed' => {
    const sets = lastSession.exerciseData.sets.filter(s => s.type === 'normal');
    
    if (sets.length === 0) return 'good'; // No data

    // Check for failure (incomplete sets)
    const hasFailedSets = sets.some(s => !s.isComplete);
    if (hasFailedSets) return 'failed';

    // Check Rest Times
    let totalRest = 0;
    let restCount = 0;
    
    sets.forEach(s => {
        if (s.actualRest) {
            totalRest += s.actualRest;
            restCount++;
        }
    });

    if (restCount > 0) {
        const avgRest = totalRest / restCount;
        // If average rest was significantly higher, it was hard
        if (avgRest >= targetRest * 1.3) return 'hard';
    }

    return 'good';
};

/**
 * Advanced Weight Suggestion Engine (Active Insights)
 */
export const getSmartWeightSuggestion = (
    exerciseId: string,
    history: WorkoutSession[],
    profile: Profile,
    allExercises: Exercise[],
    goal: UserGoal = 'muscle'
): WeightSuggestion => {
    const exHistory = getExerciseHistory(history, exerciseId);
    
    // 1. Existing History Analysis
    if (exHistory.length > 0) {
        const lastEntry = exHistory[0];
        const lastSets = lastEntry.exerciseData.sets.filter(s => s.type === 'normal' && s.isComplete && s.weight > 0);
        
        if (lastSets.length > 0) {
            const lastWeight = lastSets[lastSets.length - 1].weight;
            const increment = detectPreferredIncrement(exHistory);
            
            // Check for Rust (Atrophy)
            const daysSince = (Date.now() - lastEntry.session.startTime) / (1000 * 60 * 60 * 24);
            if (daysSince > 14) {
                const deloadWeight = Math.round((lastWeight * 0.9) / increment) * increment;
                return {
                    weight: deloadWeight,
                    reason: 'insight_reason_rust',
                    trend: 'decrease'
                };
            }

            // Analyze RPE / Performance
            // We need the exercise def to get target rest time
            const exerciseDef = allExercises.find(e => e.id === exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === exerciseId);
            const targetRest = 90; // Default if not found (we don't have access to custom timer settings here easily, assuming standard)
            
            const performance = analyzePerformance(lastEntry, targetRest);
            
            if (performance === 'good') {
                 // Standard Progression: If consistent for 2 sessions or if simple progression mode
                 // For safety, let's suggest a small bump
                 return {
                    weight: lastWeight + increment,
                    reason: 'insight_reason_progression',
                    trend: 'increase'
                };
            }

            if (performance === 'hard') {
                return {
                    weight: lastWeight,
                    reason: 'insight_reason_hard',
                    trend: 'maintain'
                };
            }

            if (performance === 'failed') {
                 return {
                    weight: lastWeight,
                    reason: 'insight_reason_failed',
                    trend: 'maintain' // Suggest trying again at same weight first, or deload if repeated (logic simplified)
                };
            }
            
            return { weight: lastWeight, reason: 'insight_reason_maintain', trend: 'maintain' };
        }
    }

    // 2. No history? Use 1RM Inference
    const syntheticAnchors = calculateSyntheticAnchors(history, allExercises, profile);
    const exerciseDef = allExercises.find(e => e.id === exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === exerciseId);
    let oneRepMax = 0;

    if (profile.oneRepMaxes?.[exerciseId]) {
        oneRepMax = profile.oneRepMaxes[exerciseId].weight;
    } else if (exerciseDef) {
        const inferred = getInferredMax(exerciseDef, syntheticAnchors, allExercises);
        if (inferred) oneRepMax = inferred.value;
    }

    if (oneRepMax > 0) {
        let percentage = 0.7; // Default Muscle
        if (goal === 'strength') percentage = 0.8;
        if (goal === 'endurance') percentage = 0.6;
        
        const target = Math.round((oneRepMax * percentage) / 2.5) * 2.5;
        return {
            weight: target,
            reason: 'insight_reason_new',
            trend: 'increase'
        };
    }

    // 3. Fallback
    return { weight: 0, reason: '', trend: 'maintain' };
};

/**
 * Legacy Wrapper for backward compatibility
 */
export const getSmartStartingWeight = (
    exerciseId: string,
    history: WorkoutSession[],
    profile: Profile,
    allExercises: Exercise[],
    goal: UserGoal = 'muscle'
): number => {
    const suggestion = getSmartWeightSuggestion(exerciseId, history, profile, allExercises, goal);
    return suggestion.weight;
};


export const calculateNormalizedStrengthScores = (history: WorkoutSession[]) => {
    const maxLifts = calculateMaxStrengthProfile(history);
    
    // Ratios: OHP (2) : Bench (3) : Row (3) : Squat (4) : Deadlift (5)
    const scores = {
        SQUAT: maxLifts.SQUAT / 4,
        DEADLIFT: maxLifts.DEADLIFT / 5,
        BENCH: maxLifts.BENCH / 3,
        OHP: maxLifts.OHP / 2,
        ROW: maxLifts.ROW / 3
    };
    
    const maxScore = Math.max(...Object.values(scores));
    const scale = maxScore > 0 ? (100 / maxScore) : 0;
    
    return {
        SQUAT: scores.SQUAT * scale,
        DEADLIFT: scores.DEADLIFT * scale,
        BENCH: scores.BENCH * scale,
        OHP: scores.OHP * scale,
        ROW: scores.ROW * scale
    };
};

export interface SupplementCorrelation {
    supplementId: string;
    supplementName: string;
    metric: 'volume' | 'prs';
    differencePercentage: number;
    sampleSizeOn: number;
    sampleSizeOff: number;
}

export const analyzeCorrelations = (
    history: WorkoutSession[],
    takenSupplements: Record<string, string[]>,
    allSupplements: SupplementPlanItem[]
): SupplementCorrelation[] => {
    const insights: SupplementCorrelation[] = [];
    const MIN_SAMPLES = 3;
    const relevantSupplements = new Set<string>();
    Object.values(takenSupplements).forEach(ids => ids.forEach(id => relevantSupplements.add(id)));

    relevantSupplements.forEach(suppId => {
        const supplementInfo = allSupplements.find(s => s.id === suppId);
        const supplementName = supplementInfo ? supplementInfo.supplement : 'Unknown Supplement';
        const onSessions: WorkoutSession[] = [];
        const offSessions: WorkoutSession[] = [];

        history.forEach(session => {
            const sessionDateStr = getDateString(new Date(session.startTime));
            const takenOnDay = takenSupplements[sessionDateStr]?.includes(suppId);
            if (takenOnDay) onSessions.push(session);
            else offSessions.push(session);
        });

        if (onSessions.length >= MIN_SAMPLES && offSessions.length >= MIN_SAMPLES) {
            const getAvgVolume = (sessions: WorkoutSession[]) => {
                const totalVol = sessions.reduce((acc, s) => 
                    acc + s.exercises.reduce((t, e) => t + e.sets.reduce((st, set) => st + (set.weight * set.reps), 0), 0), 0
                );
                return totalVol / sessions.length;
            };

            const avgVolOn = getAvgVolume(onSessions);
            const avgVolOff = getAvgVolume(offSessions);
            
            if (avgVolOff > 0) {
                const volDiff = ((avgVolOn - avgVolOff) / avgVolOff) * 100;
                if (Math.abs(volDiff) >= 5) {
                    insights.push({
                        supplementId: suppId,
                        supplementName: supplementName,
                        metric: 'volume',
                        differencePercentage: Math.round(volDiff),
                        sampleSizeOn: onSessions.length,
                        sampleSizeOff: offSessions.length
                    });
                }
            }

            const getAvgPRs = (sessions: WorkoutSession[]) => {
                const totalPRs = sessions.reduce((acc, s) => acc + (s.prCount || 0), 0);
                return totalPRs / sessions.length;
            };

            const avgPrOn = getAvgPRs(onSessions);
            const avgPrOff = getAvgPRs(offSessions);

             if (avgPrOff > 0) {
                const prDiff = ((avgPrOn - avgPrOff) / avgPrOff) * 100;
                if (Math.abs(prDiff) >= 10) {
                     insights.push({
                        supplementId: suppId,
                        supplementName: supplementName,
                        metric: 'prs',
                        differencePercentage: Math.round(prDiff),
                        sampleSizeOn: onSessions.length,
                        sampleSizeOff: offSessions.length
                    });
                }
            }
        }
    });
    return insights.sort((a, b) => Math.abs(b.differencePercentage) - Math.abs(a.differencePercentage));
};

// --- LIFTER DNA LOGIC ---

export type LifterArchetype = 'powerbuilder' | 'bodybuilder' | 'endurance' | 'hybrid' | 'beginner';

export interface LifterStats {
    consistencyScore: number; // 0-100
    volumeScore: number; // 0-100 (Normalized)
    intensityScore: number; // Based on set failure proximity or heavy weight usage (0-100)
    experienceLevel: number; // Based on total workouts
    archetype: LifterArchetype;
    favMuscle: string;
}

export const calculateLifterDNA = (history: WorkoutSession[], currentBodyWeight: number = 70): LifterStats => {
    if (history.length < 5) {
        return {
            consistencyScore: 0,
            volumeScore: 0,
            intensityScore: 0,
            experienceLevel: history.length,
            archetype: 'beginner',
            favMuscle: 'N/A'
        };
    }

    const now = Date.now();
    const last30Days = history.filter(s => (now - s.startTime) < 30 * 24 * 60 * 60 * 1000);
    
    // 1. Consistency: Target 3 workouts/week = 12/month for 100%
    const monthlyCount = last30Days.length;
    const consistencyScore = Math.min(100, Math.round((monthlyCount / 12) * 100));

    // 2. Volume & Rep Analysis for Archetype
    let weightedRepSum = 0;
    let totalVolumeForWeightedAvg = 0;
    let totalRawVolume = 0;
    
    // Separate tracking for Compound Lifts to avoid "accessory drift"
    // (e.g. doing 5x5 squats but 3x15 calves shouldn't make you a 'bodybuilder')
    let compoundWeightedRepSum = 0;
    let compoundTotalVolume = 0;
    
    const muscleCounts: Record<string, number> = {};
    const analyzedHistory = history.slice(0, 20); // Analyze last 20 sessions for archetype

    analyzedHistory.forEach(s => { 
        s.exercises.forEach(ex => {
            const def = PREDEFINED_EXERCISES.find(p => p.id === ex.exerciseId);
            if (def) {
                muscleCounts[def.bodyPart] = (muscleCounts[def.bodyPart] || 0) + 1;
            }

            ex.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete) {
                    // Raw volume for Volume Score
                    totalRawVolume += set.weight * set.reps;

                    let effectiveWeight = set.weight;
                    if (effectiveWeight <= 0) {
                        effectiveWeight = currentBodyWeight > 0 ? currentBodyWeight : 70;
                    }
                    
                    const setVolume = effectiveWeight * set.reps;
                    
                    // Global Average Tracking
                    weightedRepSum += set.reps * setVolume;
                    totalVolumeForWeightedAvg += setVolume;

                    // Compound Average Tracking
                    // Only count Barbell/Dumbbell lifts for major muscle groups
                    if (def && (def.category === 'Barbell' || def.category === 'Dumbbell') && ['Chest', 'Back', 'Legs', 'Shoulders'].includes(def.bodyPart)) {
                        compoundWeightedRepSum += set.reps * setVolume;
                        compoundTotalVolume += setVolume;
                    }
                }
            });
        });
    });

    // Calculate the Volume-Weighted Average Reps (Global)
    const globalAvgReps = totalVolumeForWeightedAvg > 0 ? weightedRepSum / totalVolumeForWeightedAvg : 0;
    
    // Calculate the Volume-Weighted Average Reps (Compound Only)
    const compoundAvgReps = compoundTotalVolume > 0 ? compoundWeightedRepSum / compoundTotalVolume : 0;
    
    let archetype: LifterArchetype = 'hybrid';
    
    // 1. PRIORITY CHECK: Heavy Compounds
    // If user is doing heavy compounds (< 6 reps), they are a Powerbuilder/Strength athlete, 
    // regardless of what their accessory work averages out to.
    if (compoundAvgReps > 0 && compoundAvgReps <= 6.5) {
        archetype = 'powerbuilder';
    } 
    // 2. Fallback to Global Average
    else {
        // We moved the threshold from 6.5 to 7.5 to better capture powerbuilders who do accessory work if compounds weren't detected
        if (globalAvgReps > 0 && globalAvgReps <= 7.5) archetype = 'powerbuilder';
        else if (globalAvgReps > 7.5 && globalAvgReps <= 13) archetype = 'bodybuilder';
        else if (globalAvgReps > 13) archetype = 'endurance';
    }

    // 3. Volume Score (Average session volume. 10,000kg/session = 100)
    const avgSessionVolume = analyzedHistory.length > 0 ? totalRawVolume / analyzedHistory.length : 0;
    const volumeScore = Math.min(100, Math.round((avgSessionVolume / 10000) * 100));

    // 4. Intensity Score (Heuristic based on avg reps)
    // Use compound avg if available for better accuracy on intensity
    const effectiveAvgReps = compoundAvgReps > 0 ? compoundAvgReps : globalAvgReps;
    
    let intensityScore = 50;
    if (effectiveAvgReps > 0) {
        if (effectiveAvgReps <= 5) intensityScore = 95;
        else if (effectiveAvgReps <= 8) intensityScore = 85;
        else if (effectiveAvgReps <= 12) intensityScore = 75;
        else if (effectiveAvgReps <= 15) intensityScore = 60;
        else intensityScore = 40;
    }

    // 5. Fav Muscle
    let favMuscle = 'Full Body';
    let maxCount = 0;
    Object.entries(muscleCounts).forEach(([muscle, count]) => {
        if (count > maxCount) {
            maxCount = count;
            favMuscle = muscle;
        }
    });

    return {
        consistencyScore,
        volumeScore,
        intensityScore,
        experienceLevel: history.length,
        archetype,
        favMuscle
    };
};

export const inferUserProfile = (history: WorkoutSession[]): SurveyAnswers => {
    const defaultProfile: SurveyAnswers = {
        experience: 'intermediate',
        goal: 'muscle',
        equipment: 'gym',
        time: 'medium'
    };

    if (history.length === 0) return defaultProfile;

    const recentSessions = history.slice(0, 10); 
    let barbellCount = 0;
    let dumbbellCount = 0;
    let machineCount = 0;
    let bodyweightCount = 0;
    let totalExercises = 0;

    recentSessions.forEach(s => {
        s.exercises.forEach(we => {
            const def = PREDEFINED_EXERCISES.find(e => e.id === we.exerciseId);
            if (def) {
                totalExercises++;
                if (def.category === 'Barbell') barbellCount++;
                else if (def.category === 'Dumbbell') dumbbellCount++;
                else if (def.category === 'Machine' || def.category === 'Cable') machineCount++;
                else if (def.category === 'Bodyweight' || def.category === 'Assisted Bodyweight') bodyweightCount++;
            }
        });
    });

    if (totalExercises > 0) {
        if (barbellCount > totalExercises * 0.3 || machineCount > totalExercises * 0.3) {
            defaultProfile.equipment = 'gym';
        } else if (dumbbellCount > totalExercises * 0.4) {
            defaultProfile.equipment = 'dumbbell';
        } else if (bodyweightCount > totalExercises * 0.5) {
            defaultProfile.equipment = 'bodyweight';
        }
    }

    let totalReps = 0;
    let setCount = 0;
    recentSessions.forEach(s => {
        s.exercises.forEach(we => {
            we.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete) {
                    totalReps += set.reps;
                    setCount++;
                }
            });
        });
    });
    
    const avgReps = setCount > 0 ? totalReps / setCount : 10;
    if (avgReps < 6) defaultProfile.goal = 'strength';
    else if (avgReps > 12) defaultProfile.goal = 'endurance';
    else defaultProfile.goal = 'muscle';

    // Time preference is better handled by the specific duration function, but we keep this for the basic profile
    const durationProfile = calculateMedianWorkoutDuration(history);
    defaultProfile.time = durationProfile;

    // Infer experience based on workout count and consistency
    if (history.length < 20) defaultProfile.experience = 'beginner';
    else if (history.length < 100) defaultProfile.experience = 'intermediate';
    else defaultProfile.experience = 'advanced';

    return defaultProfile;
};

export const calculateMedianWorkoutDuration = (history: WorkoutSession[]): 'short' | 'medium' | 'long' => {
    if (history.length < 5) return 'medium'; // Not enough data

    const durations: number[] = [];
    
    history.slice(0, 20).forEach(s => {
        if (s.endTime > s.startTime) {
            const durationMinutes = (s.endTime - s.startTime) / 60000;
            // Filter out unreasonable durations (e.g., accidental < 5m or left open > 3h)
            if (durationMinutes > 10 && durationMinutes < 180) {
                durations.push(durationMinutes);
            }
        }
    });
    
    if (durations.length === 0) return 'medium';

    durations.sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    const median = durations.length % 2 !== 0 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;

    if (median < 35) return 'short';
    if (median > 65) return 'long';
    return 'medium';
};