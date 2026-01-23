
import { WorkoutSession, SupplementPlanItem, PerformedSet, Profile, Exercise, UserGoal } from '../types';
import { getDateString } from '../utils/timeUtils';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { SurveyAnswers } from '../utils/routineGenerator';
import { calculate1RM, getExerciseHistory } from '../utils/workoutUtils';
import { ANCHOR_EXERCISES, EXERCISE_RATIOS, BODY_PART_ANCHORS, CATEGORY_RATIOS } from '../constants/ratios';

// Helper for float-friendly GCD logic
const floatGcd = (a: number, b: number): number => {
    if (a < 0.01) return b;
    return floatGcd(b % a, a);
};

export interface HabitData {
    exerciseFrequency: Record<string, number>;
    routineFrequency: Record<string, number>;
}

export const analyzeUserHabits = (history: WorkoutSession[]): HabitData => {
    const now = Date.now();
    const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(s => s.startTime > ninetyDaysAgo);

    const exerciseFrequency: Record<string, number> = {};
    const routineFrequency: Record<string, number> = {};

    recentHistory.forEach(session => {
        if (session.routineId) {
            routineFrequency[session.routineId] = (routineFrequency[session.routineId] || 0) + 1;
        }
        session.exercises.forEach(ex => {
            exerciseFrequency[ex.exerciseId] = (exerciseFrequency[ex.exerciseId] || 0) + 1;
        });
    });

    return { exerciseFrequency, routineFrequency };
};

export const MOVEMENT_PATTERNS = {
    SQUAT: ['ex-2', 'ex-101', 'ex-108', 'ex-109', 'ex-113', 'ex-160'],
    DEADLIFT: ['ex-3', 'ex-98', 'ex-43'],
    BENCH: ['ex-1', 'ex-11', 'ex-12', 'ex-22', 'ex-25', 'ex-28', 'ex-31', 'ex-34', 'ex-37'],
    OHP: ['ex-4', 'ex-60', 'ex-67', 'ex-68', 'ex-70'],
    ROW: ['ex-5', 'ex-38', 'ex-39', 'ex-40', 'ex-48'],
    VERTICAL_PULL: ['ex-10', 'ex-50', 'ex-52', 'ex-6', 'ex-44']
};

export interface PatternMax {
    weight: number;
    exerciseName?: string;
}

export const calculateMaxStrengthProfile = (history: WorkoutSession[], allExercises: Exercise[] = [], cutoffDate: number = Date.now()) => {
    const profile: Record<string, PatternMax> = {
        SQUAT: { weight: 0 },
        DEADLIFT: { weight: 0 },
        BENCH: { weight: 0 },
        OHP: { weight: 0 },
        ROW: { weight: 0 },
        VERTICAL_PULL: { weight: 0 }
    };
    const sixMonthsBeforeCutoff = cutoffDate - (180 * 24 * 60 * 60 * 1000);
    Object.entries(MOVEMENT_PATTERNS).forEach(([patternName, ids]) => {
        let maxNormalizedE1RM = 0;
        let bestExName = '';

        ids.forEach(id => {
            const exDef = PREDEFINED_EXERCISES.find(e => e.id === id) || allExercises.find(e => e.id === id);
            const exHistory = getExerciseHistory(history, id);

            // Get ratio: specific override OR category fallback
            let ratio = 1.0;
            if (EXERCISE_RATIOS[id]) {
                ratio = EXERCISE_RATIOS[id].ratio;
            } else if (exDef) {
                ratio = CATEGORY_RATIOS[exDef.category] || 1.0;
            }

            exHistory.forEach(entry => {
                if (entry.session.startTime > cutoffDate) return;
                if (entry.session.startTime < sixMonthsBeforeCutoff) return;

                entry.exerciseData.sets.forEach(set => {
                    if (set.type === 'normal' && set.isComplete && set.reps > 0 && set.reps <= 12) {
                        const e1rm = calculate1RM(set.weight, set.reps);
                        const normalized = e1rm / ratio;
                        if (normalized > maxNormalizedE1RM) {
                            maxNormalizedE1RM = normalized;
                            bestExName = exDef?.name || 'Unknown';
                        }
                    }
                });
            });
        });
        profile[patternName] = { weight: maxNormalizedE1RM, exerciseName: bestExName };
    });
    return profile;
}

export const resolveAnchorAndRatio = (exerciseId: string, allExercises: Exercise[]) => {
    if (EXERCISE_RATIOS[exerciseId]) return EXERCISE_RATIOS[exerciseId];
    let exercise = PREDEFINED_EXERCISES.find(e => e.id === exerciseId);
    if (!exercise) exercise = allExercises.find(e => e.id === exerciseId);
    if (exercise) {
        const anchorId = BODY_PART_ANCHORS[exercise.bodyPart];
        const ratio = CATEGORY_RATIOS[exercise.category];
        if (anchorId && ratio) return { anchorId, ratio };
    }
    return null;
}

export const calculateSyntheticAnchors = (history: WorkoutSession[], allExercises: Exercise[], profile?: Profile): Record<string, number> => {
    const anchors = {
        [ANCHOR_EXERCISES.SQUAT]: 0,
        [ANCHOR_EXERCISES.BENCH]: 0,
        [ANCHOR_EXERCISES.DEADLIFT]: 0,
        [ANCHOR_EXERCISES.OHP]: 0,
    };
    if (profile?.oneRepMaxes) {
        Object.values(ANCHOR_EXERCISES).forEach(anchorId => {
            if (profile.oneRepMaxes?.[anchorId]) anchors[anchorId] = profile.oneRepMaxes[anchorId].weight;
        });
    }
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    history.forEach(session => {
        if (session.startTime < sixMonthsAgo) return;
        session.exercises.forEach(ex => {
            const ratioData = resolveAnchorAndRatio(ex.exerciseId, allExercises);
            const isAnchor = Object.values(ANCHOR_EXERCISES).includes(ex.exerciseId);
            if (!ratioData && !isAnchor) return;
            const anchorId = ratioData ? ratioData.anchorId : ex.exerciseId;
            const ratio = ratioData ? ratioData.ratio : 1.0;
            let maxSetE1RM = 0;
            ex.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete && set.weight > 0 && set.reps > 0 && set.reps <= 12) {
                    const e1rm = calculate1RM(set.weight, set.reps);
                    if (e1rm > maxSetE1RM) maxSetE1RM = e1rm;
                }
            });
            if (maxSetE1RM > 0) {
                const normalizedMax = maxSetE1RM / ratio;
                if (anchors[anchorId] !== undefined && normalizedMax > anchors[anchorId]) anchors[anchorId] = normalizedMax;
            }
        });
    });
    return anchors;
};

export const getInferredMax = (exercise: Exercise, syntheticAnchors: Record<string, number>, allExercises: Exercise[]): { value: number, source: string } | null => {
    if (Object.values(ANCHOR_EXERCISES).includes(exercise.id)) {
        const val = syntheticAnchors[exercise.id];
        return val > 0 ? { value: val, source: 'History' } : null;
    }
    const mapping = resolveAnchorAndRatio(exercise.id, allExercises);
    if (mapping) {
        const anchorMax = syntheticAnchors[mapping.anchorId];
        if (anchorMax > 0) {
            const inferred = anchorMax * mapping.ratio;
            let anchorExercise = allExercises.find(e => e.id === mapping.anchorId);
            if (!anchorExercise) anchorExercise = PREDEFINED_EXERCISES.find(e => e.id === mapping.anchorId);
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
 * Plate Detective: GCD implementation to infer equipment constraints.
 */
export const detectPreferredIncrement = (historyEntries: { exerciseData: { sets: PerformedSet[] } }[]): number => {
    const weightDeltas: number[] = [];
    let lastWeight: number | null = null;

    historyEntries.slice(0, 10).forEach(entry => {
        entry.exerciseData.sets.forEach(s => {
            if (s.weight > 0) {
                if (lastWeight !== null && s.weight !== lastWeight) {
                    weightDeltas.push(Math.abs(s.weight - lastWeight));
                }
                lastWeight = s.weight;
            }
        });
    });

    if (weightDeltas.length === 0) return 2.5;

    // Use float-friendly GCD logic
    const inferredGcd = weightDeltas.reduce((acc, val) => floatGcd(acc, val), weightDeltas[0]);

    // Sanitize results: common increments are 1.25, 2.5, 5
    if (inferredGcd >= 4.5) return 5;
    if (inferredGcd >= 2.2) return 2.5;
    if (inferredGcd >= 1.0) return 1.25;

    return 2.5;
};

const analyzePerformance = (lastSession: { exerciseData: { sets: PerformedSet[] }, session: WorkoutSession }, targetRest: number): 'good' | 'hard' | 'failed' => {
    const sets = lastSession.exerciseData.sets.filter(s => s.type === 'normal');
    if (sets.length === 0) return 'good';
    const hasFailedSets = sets.some(s => !s.isComplete);
    if (hasFailedSets) return 'failed';
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
        if (avgRest >= targetRest * 1.3) return 'hard';
    }
    return 'good';
};

export const getSmartWeightSuggestion = (
    exerciseId: string,
    history: WorkoutSession[],
    profile: Profile,
    allExercises: Exercise[],
    goal: UserGoal = 'muscle'
): WeightSuggestion => {
    const exHistory = getExerciseHistory(history, exerciseId);
    if (exHistory.length > 0) {
        const lastEntry = exHistory[0];
        const lastSets = lastEntry.exerciseData.sets.filter(s => s.type === 'normal' && s.isComplete && s.weight > 0);
        if (lastSets.length > 0) {
            const lastWeight = lastSets[lastSets.length - 1].weight;
            const increment = detectPreferredIncrement(exHistory);
            const daysSince = (Date.now() - lastEntry.session.startTime) / (1000 * 60 * 60 * 24);
            if (daysSince > 14) {
                const deloadWeight = Math.round((lastWeight * 0.9) / increment) * increment;
                return { weight: deloadWeight, reason: 'insight_reason_rust', trend: 'decrease' };
            }
            const exerciseDef = allExercises.find(e => e.id === exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === exerciseId);
            const targetRest = 90;
            const performance = analyzePerformance(lastEntry, targetRest);
            if (performance === 'good') return { weight: lastWeight + increment, reason: 'insight_reason_progression', trend: 'increase' };
            if (performance === 'hard') return { weight: lastWeight, reason: 'insight_reason_hard', trend: 'maintain' };
            if (performance === 'failed') return { weight: lastWeight, reason: 'insight_reason_failed', trend: 'maintain' };
            return { weight: lastWeight, reason: 'insight_reason_maintain', trend: 'maintain' };
        }
    }
    const syntheticAnchors = calculateSyntheticAnchors(history, allExercises, profile);
    const exerciseDef = allExercises.find(e => e.id === exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === exerciseId);
    let oneRepMax = 0;
    if (profile.oneRepMaxes?.[exerciseId]) oneRepMax = profile.oneRepMaxes[exerciseId].weight;
    else if (exerciseDef) {
        const inferred = getInferredMax(exerciseDef, syntheticAnchors, allExercises);
        if (inferred) oneRepMax = inferred.value;
    }
    if (oneRepMax > 0) {
        let percentage = 0.7;
        if (goal === 'strength') percentage = 0.8;
        if (goal === 'endurance') percentage = 0.6;
        const target = Math.round((oneRepMax * percentage) / 2.5) * 2.5;
        return { weight: target, reason: 'insight_reason_new', trend: 'increase' };
    }
    return { weight: 0, reason: '', trend: 'maintain' };
};

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

export const calculateNormalizedStrengthScores = (history: WorkoutSession[], allExercises: Exercise[] = []) => {
    const maxLifts = calculateMaxStrengthProfile(history, allExercises);
    const scores = {
        SQUAT: maxLifts.SQUAT.weight / 4,
        DEADLIFT: maxLifts.DEADLIFT.weight / 5,
        BENCH: maxLifts.BENCH.weight / 3,
        OHP: maxLifts.OHP.weight / 2,
        ROW: maxLifts.ROW.weight / 3,
        VERTICAL_PULL: maxLifts.VERTICAL_PULL.weight / 3
    };
    const maxScore = Math.max(...Object.values(scores));
    const scale = maxScore > 0 ? (100 / maxScore) : 0;
    return {
        SQUAT: scores.SQUAT * scale,
        DEADLIFT: scores.DEADLIFT * scale,
        BENCH: scores.BENCH * scale,
        OHP: scores.OHP * scale,
        ROW: scores.ROW * scale,
        VERTICAL_PULL: scores.VERTICAL_PULL * scale
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
                const totalVol = sessions.reduce((acc, s) => acc + s.exercises.reduce((t, e) => t + e.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0), 0);
                return totalVol / sessions.length;
            };
            const avgVolOn = getAvgVolume(onSessions);
            const avgVolOff = getAvgVolume(offSessions);
            if (avgVolOff > 0) {
                const volDiff = ((avgVolOn - avgVolOff) / avgVolOff) * 100;
                if (Math.abs(volDiff) >= 5) insights.push({ supplementId: suppId, supplementName: supplementName, metric: 'volume', differencePercentage: Math.round(volDiff), sampleSizeOn: onSessions.length, sampleSizeOff: offSessions.length });
            }
            const getAvgPRs = (sessions: WorkoutSession[]) => sessions.reduce((acc, s) => acc + (s.prCount || 0), 0) / sessions.length;
            const avgPrOn = getAvgPRs(onSessions);
            const avgPrOff = getAvgPRs(offSessions);
            if (avgPrOff > 0) {
                const prDiff = ((avgPrOn - avgPrOff) / avgPrOff) * 100;
                if (Math.abs(prDiff) >= 10) insights.push({ supplementId: suppId, supplementName: supplementName, metric: 'prs', differencePercentage: Math.round(prDiff), sampleSizeOn: onSessions.length, sampleSizeOff: offSessions.length });
            }
        }
    });
    return insights.sort((a, b) => Math.abs(b.differencePercentage) - Math.abs(a.differencePercentage));
};

export type LifterArchetype = 'powerbuilder' | 'bodybuilder' | 'endurance' | 'hybrid' | 'beginner';

export interface LifterStats {
    consistencyScore: number;
    volumeScore: number;
    intensityScore: number;
    experienceLevel: number;
    archetype: LifterArchetype;
    favMuscle: string;
    efficiencyScore: number; // New: Workout Density efficiency
    rawConsistency: number;  // Workouts in last 30d
    rawVolume: number;       // Avg session volume
    rawIntensity: number;    // Avg reps
}

export const calculateLifterDNA = (history: WorkoutSession[], currentBodyWeight: number = 70): LifterStats => {
    if (history.length < 5) {
        return {
            consistencyScore: 0,
            volumeScore: 0,
            intensityScore: 0,
            experienceLevel: history.length,
            archetype: 'beginner',
            favMuscle: 'N/A',
            efficiencyScore: 0,
            rawConsistency: 0,
            rawVolume: 0,
            rawIntensity: 0
        };
    }

    const now = Date.now();
    const last30Days = history.filter(s => (now - s.startTime) < 30 * 24 * 60 * 60 * 1000);
    const monthlyCount = last30Days.length;
    const consistencyScore = Math.min(100, Math.round((monthlyCount / 12) * 100));

    let weightedRepSum = 0;
    let totalVolumeForWeightedAvg = 0;
    let totalRawVolume = 0;
    let compoundWeightedRepSum = 0;
    let compoundTotalVolume = 0;
    const muscleCounts: Record<string, number> = {};
    const analyzedHistory = history.slice(0, 20);

    analyzedHistory.forEach(s => {
        s.exercises.forEach(ex => {
            const def = PREDEFINED_EXERCISES.find(p => p.id === ex.exerciseId);
            if (def) muscleCounts[def.bodyPart] = (muscleCounts[def.bodyPart] || 0) + 1;
            ex.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete) {
                    totalRawVolume += set.weight * set.reps;
                    let effectiveWeight = set.weight || currentBodyWeight || 70;
                    const setVolume = effectiveWeight * set.reps;
                    weightedRepSum += set.reps * setVolume;
                    totalVolumeForWeightedAvg += setVolume;
                    if (def && (def.category === 'Barbell' || def.category === 'Dumbbell') && ['Chest', 'Back', 'Legs', 'Shoulders'].includes(def.bodyPart)) {
                        compoundWeightedRepSum += set.reps * setVolume;
                        compoundTotalVolume += setVolume;
                    }
                }
            });
        });
    });

    const globalAvgReps = totalVolumeForWeightedAvg > 0 ? weightedRepSum / totalVolumeForWeightedAvg : 0;
    const compoundAvgReps = compoundTotalVolume > 0 ? compoundWeightedRepSum / compoundTotalVolume : 0;

    let archetype: LifterArchetype = 'hybrid';
    if (compoundAvgReps > 0 && compoundAvgReps <= 6.5) archetype = 'powerbuilder';
    else {
        if (globalAvgReps > 0 && globalAvgReps <= 7.5) archetype = 'powerbuilder';
        else if (globalAvgReps > 7.5 && globalAvgReps <= 13) archetype = 'bodybuilder';
        else if (globalAvgReps > 13) archetype = 'endurance';
    }

    const avgSessionVolume = analyzedHistory.length > 0 ? totalRawVolume / analyzedHistory.length : 0;
    const volumeScore = Math.min(100, Math.round((avgSessionVolume / 10000) * 100));
    const effectiveAvgReps = compoundAvgReps > 0 ? compoundAvgReps : globalAvgReps;
    let intensityScore = 50;
    if (effectiveAvgReps > 0) {
        if (effectiveAvgReps <= 5) intensityScore = 95;
        else if (effectiveAvgReps <= 8) intensityScore = 85;
        else if (effectiveAvgReps <= 12) intensityScore = 75;
        else if (effectiveAvgReps <= 15) intensityScore = 60;
        else intensityScore = 40;
    }

    let favMuscle = 'Full Body';
    let maxCount = 0;
    Object.entries(muscleCounts).forEach(([muscle, count]) => {
        if (count > maxCount) { maxCount = count; favMuscle = muscle; }
    });

    // Efficiency Score based on Density Trend
    const recentDensities = analyzedHistory.map(h => {
        const duration = (h.endTime - h.startTime) / 60000;
        const vol = h.exercises.reduce((a, e) => a + e.sets.reduce((sa, s) => sa + (s.isComplete ? s.weight * s.reps : 0), 0), 0);
        return duration > 5 ? vol / duration : 0;
    }).filter(d => d > 0);

    let efficiencyScore = 100;
    if (recentDensities.length >= 4) {
        const currentDensity = recentDensities[0];
        const avgDensity = recentDensities.slice(1, 5).reduce((a, b) => a + b, 0) / 4;
        efficiencyScore = Math.min(100, Math.round((currentDensity / avgDensity) * 100));
    }

    return {
        consistencyScore,
        volumeScore,
        intensityScore,
        experienceLevel: history.length,
        archetype,
        favMuscle,
        efficiencyScore,
        rawConsistency: monthlyCount,
        rawVolume: Math.round(avgSessionVolume),
        rawIntensity: Math.round(effectiveAvgReps * 10) / 10
    };
};

export const inferUserProfile = (history: WorkoutSession[]): SurveyAnswers => {
    const defaultProfile: SurveyAnswers = { experience: 'intermediate', goal: 'muscle', equipment: 'gym', time: 'medium' };
    if (history.length === 0) return defaultProfile;
    const recentSessions = history.slice(0, 10);
    let barbellCount = 0, dumbbellCount = 0, machineCount = 0, bodyweightCount = 0, totalExercises = 0;
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
        if (barbellCount > totalExercises * 0.3 || machineCount > totalExercises * 0.3) defaultProfile.equipment = 'gym';
        else if (dumbbellCount > totalExercises * 0.4) defaultProfile.equipment = 'dumbbell';
        else if (bodyweightCount > totalExercises * 0.5) defaultProfile.equipment = 'bodyweight';
    }
    let totalReps = 0, setCount = 0;
    recentSessions.forEach(s => {
        s.exercises.forEach(we => {
            we.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete) { totalReps += set.reps; setCount++; }
            });
        });
    });
    const avgReps = setCount > 0 ? totalReps / setCount : 10;
    if (avgReps < 6) defaultProfile.goal = 'strength';
    else if (avgReps > 12) defaultProfile.goal = 'endurance';
    else defaultProfile.goal = 'muscle';
    defaultProfile.time = calculateMedianWorkoutDuration(history);
    if (history.length < 20) defaultProfile.experience = 'beginner';
    else if (history.length < 100) defaultProfile.experience = 'intermediate';
    else defaultProfile.experience = 'advanced';
    return defaultProfile;
};

export const calculateMedianWorkoutDuration = (history: WorkoutSession[]): 'short' | 'medium' | 'long' => {
    if (history.length < 5) return 'medium';
    const durations: number[] = [];
    history.slice(0, 20).forEach(s => {
        if (s.endTime > s.startTime) {
            const durationMinutes = (s.endTime - s.startTime) / 60000;
            if (durationMinutes > 10 && durationMinutes < 180) durations.push(durationMinutes);
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
