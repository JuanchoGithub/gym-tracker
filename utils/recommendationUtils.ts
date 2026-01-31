
import { WorkoutSession, Routine, Exercise, BodyPart, Profile, UserGoal, MuscleGroup } from '../types';
import { calculateMuscleFreshness, calculateSystemicFatigue, calculateSessionDensity, calculateAverageDensity } from './fatigueUtils';
import { MUSCLES } from '../constants/muscles';
import { generateSmartRoutine, RoutineFocus, RoutineLevel, SurveyAnswers } from './routineGenerator';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { PROGRESSION_PATHS } from '../constants/progression';
import { getExerciseHistory } from './workoutUtils';
import { predictNextRoutine, getProtectedMuscles, generateGapSession } from './smartCoachUtils';
import { inferUserProfile, MOVEMENT_PATTERNS, calculateMaxStrengthProfile, calculateMedianWorkoutDuration, analyzeUserHabits, calculateLifterDNA, detectTechnicalPRs } from '../services/analyticsService';

export interface Recommendation {
    type: 'rest' | 'workout' | 'promotion' | 'active_recovery' | 'imbalance' | 'deload' | 'update_1rm' | 'goal_mismatch' | 'density_warning' | 'stall' | 'circadian_nudge' | 'volume_pivot' | 'efficiency_warning' | 'technical_pr';
    titleKey: string;
    titleParams?: Record<string, string | number>;
    reasonKey: string;
    reasonParams?: Record<string, string | number>;
    suggestedBodyParts: BodyPart[];
    relevantRoutineIds: string[];
    generatedRoutine?: Routine;
    promotionData?: {
        fromId: string;
        toId: string;
        fromName: string;
        toName: string;
    };
    systemicFatigue?: {
        score: number;
        level: 'Low' | 'Medium' | 'High';
    };
    update1RMData?: {
        exerciseId: string;
        exerciseName: string;
        oldMax: number;
        newMax: number;
    };
    goalMismatchData?: {
        currentGoal: UserGoal;
        detectedGoal: UserGoal;
        avgReps: number;
    };
    stallData?: {
        exerciseId: string;
        exerciseName: string;
        weight: number;
        sessionsCount: number;
    };
    pivotData?: {
        exerciseId: string;
        exerciseName: string;
        fromSets: number;
        toSets: number;
    };
}

const PUSH_MUSCLES = [MUSCLES.PECTORALS, MUSCLES.FRONT_DELTS, MUSCLES.TRICEPS];
const PULL_MUSCLES = [MUSCLES.LATS, MUSCLES.TRAPS, MUSCLES.BICEPS];
const LEG_MUSCLES = [MUSCLES.QUADS, MUSCLES.HAMSTRINGS, MUSCLES.GLUTES];
const FULL_BODY_MUSCLES = [...PUSH_MUSCLES, ...PULL_MUSCLES, ...LEG_MUSCLES];

const LEVEL_SCORES: Record<string, number> = { 'Untrained': 0, 'Novice': 1, 'Intermediate': 2, 'Advanced': 3, 'Elite': 4 };

const STRENGTH_STANDARDS = {
    male: { SQUAT: { nov: 1.1, int: 1.5, adv: 2.1, elite: 2.6 }, BENCH: { nov: 0.8, int: 1.1, adv: 1.45, elite: 1.9 }, DEADLIFT: { nov: 1.3, int: 1.7, adv: 2.3, elite: 2.9 }, OHP: { nov: 0.55, int: 0.75, adv: 0.95, elite: 1.2 }, },
    female: { SQUAT: { nov: 0.8, int: 1.1, adv: 1.5, elite: 1.9 }, BENCH: { nov: 0.5, int: 0.7, adv: 0.95, elite: 1.25 }, DEADLIFT: { nov: 1.0, int: 1.3, adv: 1.8, elite: 2.3 }, OHP: { nov: 0.35, int: 0.5, adv: 0.7, elite: 0.9 }, }
};

const getProficiency = (lift: 'SQUAT' | 'BENCH' | 'DEADLIFT' | 'OHP', weight: number, bw: number, gender: 'male' | 'female'): string => {
    const standards = STRENGTH_STANDARDS[gender][lift];
    const ratio = weight / bw;
    if (ratio >= standards.elite) return 'Elite';
    if (ratio >= standards.adv) return 'Advanced';
    if (ratio >= standards.int) return 'Intermediate';
    if (ratio >= standards.nov) return 'Novice';
    return 'Untrained';
};

const RATIOS = { SQ_DL: 1.25, BN_SQ: 1.33, OH_BN: 0.66 };

export const detectGoalMismatch = (profile: Profile, history: WorkoutSession[]): Recommendation | null => {
    if (profile.smartGoalDetection === false) return null;
    if (profile.goalMismatchSnoozedUntil && Date.now() < profile.goalMismatchSnoozedUntil) return null;
    if (history.length < 10) return null;
    const lifterStats = calculateLifterDNA(history);
    let detectedGoal: UserGoal = 'muscle';
    if (lifterStats.archetype === 'powerbuilder') detectedGoal = 'strength';
    else if (lifterStats.archetype === 'bodybuilder') detectedGoal = 'muscle';
    else if (lifterStats.archetype === 'endurance') detectedGoal = 'endurance';
    const currentGoal = profile.mainGoal || 'muscle';
    if (detectedGoal === currentGoal || lifterStats.archetype === 'hybrid' || lifterStats.archetype === 'beginner') return null;
    let repRange = "8-12";
    if (detectedGoal === 'strength') repRange = "< 6";
    else if (detectedGoal === 'endurance') repRange = "15+";
    return { type: 'goal_mismatch', titleKey: 'rec_title_goal_mismatch', reasonKey: 'rec_reason_goal_mismatch', reasonParams: { current: currentGoal, detected: detectedGoal, reps: repRange }, suggestedBodyParts: [], relevantRoutineIds: [], goalMismatchData: { currentGoal, detectedGoal, avgReps: 0 } };
};

export const getAvailablePromotion = (currentExerciseId: string, history: WorkoutSession[], profile?: Profile, currentBodyweight?: number): string | null => {
    const now = Date.now();
    const path = PROGRESSION_PATHS.find(p => p.baseExerciseId === currentExerciseId);
    if (!path) return null;
    if (profile?.promotionSnoozes?.[path.baseExerciseId] && now < profile.promotionSnoozes[path.baseExerciseId]) return null;
    const exHistory = getExerciseHistory(history, path.baseExerciseId);
    if (exHistory.length === 0) return null;
    let sessionsMetCriteria = 0;
    for (const entry of exHistory) {
        const bestSet = entry.exerciseData.sets.reduce((best, current) => {
            if (!current.isComplete || current.type !== 'normal') return best;
            return (current.weight * current.reps > best.weight * best.reps) ? current : best;
        }, { weight: 0, reps: 0, type: 'normal', id: '', isComplete: false });
        let met = true;
        if (path.criteria.minReps && bestSet.reps < path.criteria.minReps) met = false;
        if (path.criteria.minWeightRatio && currentBodyweight) { if (bestSet.weight < (currentBodyweight * path.criteria.minWeightRatio)) met = false; }
        if (met) sessionsMetCriteria++;
        if (sessionsMetCriteria >= path.criteria.requiredSessions) break;
    }
    if (sessionsMetCriteria >= path.criteria.requiredSessions) return path.targetExerciseId;
    return null;
};

export const detectPromotions = (history: WorkoutSession[], exercises: Exercise[], routines: Routine[], t: (key: string, replacements?: Record<string, string | number>) => string, currentBodyweight?: number, profile?: Profile): Recommendation | null => {
    for (const path of PROGRESSION_PATHS) {
        const targetId = getAvailablePromotion(path.baseExerciseId, history, profile, currentBodyweight);
        if (targetId) {
            const fromEx = exercises.find(e => e.id === path.baseExerciseId) || PREDEFINED_EXERCISES.find(e => e.id === path.baseExerciseId);
            const toEx = exercises.find(e => e.id === targetId) || PREDEFINED_EXERCISES.find(e => e.id === targetId);
            if (fromEx && toEx) {
                const fromName = t(fromEx.id as any) !== fromEx.id ? t(fromEx.id as any) : fromEx.name;
                const toName = t(toEx.id as any) !== toEx.id ? t(toEx.id as any) : toEx.name;
                const relevantRoutineIds = routines.filter(r => r.exercises.some(e => e.exerciseId === path.baseExerciseId)).map(r => r.id);
                if (relevantRoutineIds.length > 0) {
                    return { type: 'promotion', titleKey: 'rec_title_promotion', titleParams: { from: fromName, to: toName }, reasonKey: path.reasonKey, reasonParams: { from: fromName, to: toName }, suggestedBodyParts: [], relevantRoutineIds, promotionData: { fromId: fromEx.id, toId: toEx.id, fromName: fromEx.name, toName: toEx.name } };
                }
            }
        }
    }
    return null;
}

export const detectImbalances = (history: WorkoutSession[], routines: Routine[], exercises: Exercise[], t: (key: string, replacements?: Record<string, string | number>) => string, currentBodyWeight?: number, profile?: Profile): Recommendation | null => {
    if (history.length < 15) return null;
    const currentProfile = calculateMaxStrengthProfile(history);
    const MIN_STRENGTH_THRESHOLD = 40;
    const max1RM = Math.max(currentProfile.SQUAT.weight, currentProfile.DEADLIFT.weight, currentProfile.BENCH.weight);
    if (max1RM < MIN_STRENGTH_THRESHOLD) return null;
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const historicalDate = Date.now() - TWO_WEEKS_MS;
    const historicalProfile = calculateMaxStrengthProfile(history, [], historicalDate);
    let worstImbalance: Recommendation | null = null;
    let maxDeviation = 0.15;
    let targetFocus: RoutineFocus = 'full_body';
    const getRankedRoutineIds = (targetPatterns: string[]) => {
        const scored = routines.map(r => {
            const total = r.exercises.length;
            if (total === 0) return { id: r.id, score: 0, lastUsed: 0, name: '' };
            const matches = r.exercises.filter(e => targetPatterns.includes(e.exerciseId)).length;
            const score = matches / total;
            let name = r.name;
            if (r.id.startsWith('rt-')) { const key = `${r.id.replace(/-/g, '_')}_name`; const val = t(key); if (val !== key) name = val; }
            return { id: r.id, score, lastUsed: r.lastUsed || 0, name };
        });
        const relevant = scored.filter(s => s.score > 0);
        relevant.sort((a, b) => { if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score; if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed; return a.name.localeCompare(b.name); });
        return relevant.slice(0, 4).map(x => x.id);
    };
    const analyzePair = (liftA: keyof typeof currentProfile, liftB: keyof typeof currentProfile, ratio: number, titleKey: string, reasonKey: string, bodyParts: BodyPart[], targetPatterns: string[], focusForWeakB: RoutineFocus) => {
        const valA = currentProfile[liftA].weight, valB = currentProfile[liftB].weight;
        if (valA > MIN_STRENGTH_THRESHOLD && valB > 0) {
            const targetB = valA * ratio;
            if (valB < targetB) {
                const currentDiff = targetB - valB;
                const currentDeviation = currentDiff / targetB;
                if (currentDeviation > maxDeviation) {
                    const histValA = historicalProfile[liftA]?.weight || 0, histValB = historicalProfile[liftB]?.weight || 0;
                    if (histValA < MIN_STRENGTH_THRESHOLD || histValB < MIN_STRENGTH_THRESHOLD * 0.5) return null;
                    const histTargetB = histValA * ratio, histDiff = histTargetB - histValB, histDeviation = histDiff / histTargetB;
                    if (histDeviation > 0.10 && currentDeviation >= histDeviation) {
                        targetFocus = focusForWeakB;
                        return { type: 'imbalance' as const, titleKey, reasonKey, reasonParams: { [liftA.toLowerCase()]: Math.round(valA), [liftB.toLowerCase()]: Math.round(valB) }, suggestedBodyParts: bodyParts, relevantRoutineIds: getRankedRoutineIds(targetPatterns) };
                    }
                }
            }
        }
        return null;
    };
    const sqDl = analyzePair('SQUAT', 'DEADLIFT', RATIOS.SQ_DL, 'imbalance_squat_deadlift_title', 'imbalance_squat_deadlift_desc', ['Back', 'Legs'], MOVEMENT_PATTERNS.DEADLIFT, 'pull');
    if (sqDl) { worstImbalance = sqDl; maxDeviation = (sqDl.reasonParams?.deadlift as number / sqDl.reasonParams?.squat as number); }
    const bnSq = analyzePair('BENCH', 'SQUAT', RATIOS.BN_SQ, 'imbalance_bench_squat_title', 'imbalance_bench_squat_desc', ['Legs'], MOVEMENT_PATTERNS.SQUAT, 'legs');
    if (bnSq) worstImbalance = bnSq;
    const ohBn = analyzePair('BENCH', 'OHP', RATIOS.OH_BN, 'imbalance_ohp_bench_title', 'imbalance_ohp_bench_desc', ['Shoulders'], MOVEMENT_PATTERNS.OHP, 'push');
    if (ohBn) worstImbalance = ohBn;
    const pushPull = analyzePair('BENCH', 'ROW', 0.85, 'imbalance_push_pull_title', 'imbalance_push_pull_desc', ['Back', 'Shoulders'], MOVEMENT_PATTERNS.ROW, 'pull');
    if (pushPull) worstImbalance = pushPull;
    const vertBal = analyzePair('OHP', 'VERTICAL_PULL', 0.85, 'imbalance_vertical_balance_title', 'imbalance_vertical_balance_desc', ['Back'], MOVEMENT_PATTERNS.VERTICAL_PULL, 'pull');
    if (vertBal) worstImbalance = vertBal;
    if (currentBodyWeight && currentBodyWeight > 0 && profile?.gender && worstImbalance === null) {
        const profGender = profile.gender;
        const levelSquat = getProficiency('SQUAT', currentProfile.SQUAT.weight, currentBodyWeight, profGender), levelBench = getProficiency('BENCH', currentProfile.BENCH.weight, currentBodyWeight, profGender), levelDeadlift = getProficiency('DEADLIFT', currentProfile.DEADLIFT.weight, currentBodyWeight, profGender), levelOhp = getProficiency('OHP', currentProfile.OHP.weight, currentBodyWeight, profGender);
        const scoreUpper = Math.max(LEVEL_SCORES[levelBench], LEVEL_SCORES[levelOhp]), scoreLower = Math.max(LEVEL_SCORES[levelSquat], LEVEL_SCORES[levelDeadlift]);
        if (scoreUpper >= scoreLower + 2) {
            targetFocus = 'legs';
            worstImbalance = { type: 'imbalance', titleKey: 'imbalance_upper_dominant_title', reasonKey: 'imbalance_upper_dominant_desc', reasonParams: { upper_level: levelBench === 'Untrained' ? levelOhp : levelBench, lower_level: levelSquat === 'Untrained' ? levelDeadlift : levelSquat }, suggestedBodyParts: ['Legs'], relevantRoutineIds: getRankedRoutineIds([...MOVEMENT_PATTERNS.SQUAT, ...MOVEMENT_PATTERNS.DEADLIFT]) };
        } else if (scoreLower >= scoreUpper + 2) {
            targetFocus = 'upper';
            worstImbalance = { type: 'imbalance', titleKey: 'imbalance_lower_dominant_title', reasonKey: 'imbalance_lower_dominant_desc', reasonParams: { lower_level: levelSquat === 'Untrained' ? levelDeadlift : levelSquat, upper_level: levelBench === 'Untrained' ? levelOhp : levelBench }, suggestedBodyParts: ['Chest', 'Shoulders', 'Back'], relevantRoutineIds: getRankedRoutineIds([...MOVEMENT_PATTERNS.BENCH, ...MOVEMENT_PATTERNS.OHP]) };
        }
    }
    if (worstImbalance) {
        const userProfile = inferUserProfile(history);
        if (profile?.mainGoal) userProfile.goal = profile.mainGoal;
        const habitData = analyzeUserHabits(history);
        const generatedRoutine = generateSmartRoutine(targetFocus, userProfile, t, exercises, habitData.exerciseFrequency);
        generatedRoutine.name = t('smart_routine_name', { focus: t(`focus_${targetFocus}`) });
        return { ...worstImbalance, generatedRoutine };
    }
    return worstImbalance;
}

export const detectCircadianNudge = (t: (key: string, replacements?: Record<string, string | number>) => string): Recommendation | null => {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth(); // 0-11
    const timezoneOffset = now.getTimezoneOffset(); // mins

    // Simple hemisphere detection: - offset usually means Western/Southern for GMT-3 (South America)
    // Jan/Feb/Dec is Summer in Southern, Winter in Northern.
    const isSouthernHemisphere = timezoneOffset < 0 && timezoneOffset >= -360; // Loose check for Americas
    const isSummer = isSouthernHemisphere ? (month === 0 || month === 1 || month === 11) : (month >= 5 && month <= 7);

    if (hour >= 5 && hour < 9) {
        return {
            type: 'circadian_nudge',
            titleKey: 'rec_title_circadian_morning',
            reasonKey: isSummer ? 'rec_reason_morning_summer' : 'rec_reason_morning_winter',
            reasonParams: { count: 8 },
            suggestedBodyParts: ['Mobility'],
            relevantRoutineIds: []
        };
    }

    if (hour >= 13 && hour < 17) {
        return {
            type: 'circadian_nudge',
            titleKey: 'rec_title_circadian_afternoon',
            reasonKey: 'rec_reason_afternoon',
            suggestedBodyParts: [],
            relevantRoutineIds: []
        };
    }

    if (hour >= 20 || hour < 5) {
        return {
            type: 'circadian_nudge',
            titleKey: 'rec_title_circadian_night',
            reasonKey: 'rec_reason_night',
            suggestedBodyParts: [],
            relevantRoutineIds: []
        };
    }

    return null;
};

export const detectEfficiencyIssues = (history: WorkoutSession[]): Recommendation | null => {
    if (history.length === 0) return null;
    const lastSession = history[0];

    // Check for "Rest Creep"
    let longRestSets = 0;
    lastSession.exercises.forEach(ex => {
        ex.sets.forEach(s => {
            if (s.actualRest && s.actualRest > 300) longRestSets++;
        });
    });

    if (longRestSets >= 3) {
        return {
            type: 'efficiency_warning',
            titleKey: 'rec_title_efficiency_warning',
            reasonKey: 'rec_reason_efficiency_warning',
            suggestedBodyParts: [],
            relevantRoutineIds: []
        };
    }
    return null;
};

export const detectStalls = (history: WorkoutSession[], exercises: Exercise[], t: (key: string, replacements?: Record<string, string | number>) => string, profile?: Profile): Recommendation | null => {
    if (history.length < 5) return null;

    const habitData = analyzeUserHabits(history);
    const frequentExIds = Object.entries(habitData.exerciseFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(e => e[0]);

    for (const exId of frequentExIds) {
        const exHistory = getExerciseHistory(history, exId);
        if (exHistory.length < 3) continue;

        let stallCount = 0;
        let lastWeight = 0;
        let stallCycleCount = 0; // Tracking how many times they've stalled at this weight across deloads

        // Scan history to see if they've hit this threshold before
        const weightInstances = exHistory.map(h => {
            const sets = h.exerciseData.sets.filter(s => s.type === 'normal');
            return sets.length > 0 ? Math.max(...sets.map(s => s.weight)) : 0;
        });

        const currentWeight = weightInstances[0];
        if (currentWeight === 0) continue;

        // Count consecutive sessions without an increase
        stallCount = 1;
        for (let i = 1; i < weightInstances.length; i++) {
            // If the previous weight was the same or higher than now, it is a consecutive session without progress
            if (weightInstances[i] >= currentWeight && weightInstances[i] > 0) {
                stallCount++;
            } else {
                // We found a session with lower weight, meaning progress was happening before that point
                break;
            }
        }

        // Count how many deload cycles happened for this weight (if weight dropped then came back to currentWeight)
        let foundDeload = false;
        for (let i = 1; i < weightInstances.length; i++) {
            if (weightInstances[i] < currentWeight * 0.95) foundDeload = true;
            if (foundDeload && weightInstances[i] >= currentWeight * 0.98) {
                stallCycleCount++;
                foundDeload = false;
            }
        }

        if (stallCount >= 3) {
            const exDef = exercises.find(e => e.id === exId) || PREDEFINED_EXERCISES.find(e => e.id === exId);
            if (!exDef) continue;
            const name = t(exDef.id as any) !== exDef.id ? t(exDef.id as any) : exDef.name;

            // IF STALLED TWICE (Persistent Plateau) -> Suggest PIVOT
            if (stallCycleCount >= 1) {
                const goal = profile?.mainGoal || 'muscle';
                if (goal === 'strength') {
                    return {
                        type: 'volume_pivot',
                        titleKey: 'rec_title_pivot_volume',
                        reasonKey: 'rec_reason_pivot_volume',
                        suggestedBodyParts: [exDef.bodyPart as BodyPart],
                        relevantRoutineIds: [],
                        pivotData: {
                            exerciseId: exId,
                            exerciseName: name,
                            fromSets: 5, // Assuming 5x5 as base for strength pivot
                            toSets: 3
                        }
                    };
                } else if (goal === 'muscle') {
                    return {
                        type: 'stall',
                        titleKey: 'rec_title_pivot_reps',
                        reasonKey: 'rec_reason_pivot_reps',
                        reasonParams: { range: '5-8' },
                        suggestedBodyParts: [exDef.bodyPart as BodyPart],
                        relevantRoutineIds: []
                    };
                }
            }

            // Regular Stall (First time)
            return {
                type: 'stall',
                titleKey: 'rec_title_stall',
                titleParams: { exercise: name },
                reasonKey: 'rec_reason_stall',
                reasonParams: { weight: currentWeight, unit: 'kg', count: stallCount },
                suggestedBodyParts: [exDef.bodyPart as BodyPart],
                relevantRoutineIds: [],
                stallData: { exerciseId: exId, exerciseName: name, weight: currentWeight, sessionsCount: stallCount }
            };
        }
    }

    return null;
};

export const getWorkoutRecommendation = (
    history: WorkoutSession[],
    routines: Routine[],
    exercises: Exercise[],
    t: (key: string, replacements?: Record<string, string | number>) => string,
    currentBodyweight?: number,
    profile?: Profile
): Recommendation | null => {
    const userProfile = inferUserProfile(history);
    if (profile?.mainGoal) userProfile.goal = profile.mainGoal;
    const customRoutines = routines.filter(r => !r.id.startsWith('rt-'));
    const isOnboardingPhase = history.length < 15;
    const lastSession = history.length > 0 ? history[0] : null;
    const habitData = analyzeUserHabits(history);
    const { routineFrequency, exerciseFrequency } = habitData;
    const systemicFatigue = calculateSystemicFatigue(history, exercises);
    const freshness = calculateMuscleFreshness(history, exercises, profile?.mainGoal, profile);

    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const trainedToday = lastSession && (lastSession.startTime >= todayStart || (lastSession.endTime > 0 && lastSession.endTime >= todayStart));

    if (trainedToday) {
        const techPRs = detectTechnicalPRs(history, exercises, t);
        if (techPRs.length > 0) {
            const pr = techPRs[0];
            return {
                type: 'technical_pr',
                titleKey: 'rec_title_technical_pr',
                reasonKey: 'rec_reason_technical_pr',
                reasonParams: { weight: pr.weight.toString(), unit: 'kg', percent: pr.restReductionPercent.toString() },
                suggestedBodyParts: [],
                relevantRoutineIds: [],
                systemicFatigue
            };
        }

        const volume = lastSession?.exercises.reduce((total, ex) => total + ex.sets.reduce((t, s) => t + (s.isComplete ? s.weight * s.reps : 0), 0), 0) || 0;
        return { type: 'active_recovery', titleKey: "rec_title_workout_complete", reasonKey: "rec_reason_workout_complete", reasonParams: { volume: volume.toString() }, suggestedBodyParts: ['Mobility'], relevantRoutineIds: routines.filter(r => r.name.includes('Mobility') || r.exercises.some(ex => exercises.find(e => e.id === ex.exerciseId)?.bodyPart === 'Mobility')).map(r => r.id), systemicFatigue };
    }

    // Bio-Adaptive Pre-emptive Deload Check (Density Drop)
    if (profile?.bioAdaptiveEngine && history.length >= 5) {
        const currentDensity = calculateSessionDensity(history[0]);
        const avgDensity = calculateAverageDensity(history.slice(1, 6), 5);
        if (currentDensity > 0 && avgDensity > 0 && currentDensity < avgDensity * 0.8) {
            const dropPercent = Math.round((1 - currentDensity / avgDensity) * 100);
            return {
                type: 'density_warning',
                titleKey: 'coach_warning_density_drop_title',
                reasonKey: 'coach_warning_density_drop_desc',
                reasonParams: { percent: dropPercent.toString() },
                suggestedBodyParts: ['Mobility', 'Cardio'],
                relevantRoutineIds: [],
                generatedRoutine: generateGapSession(['Quads', 'Hamstrings', 'Glutes'] as any, exercises, history, t, userProfile, freshness, currentBodyweight, profile),
                systemicFatigue
            };
        }
    }

    if (systemicFatigue.level === 'High') {
        return { type: 'deload', titleKey: 'rec_title_deload', reasonKey: 'rec_reason_cns_fatigue', reasonParams: { score: systemicFatigue.score.toString() }, suggestedBodyParts: ['Mobility', 'Cardio'], relevantRoutineIds: [], generatedRoutine: generateGapSession([], exercises, history, t, userProfile, freshness, currentBodyweight, profile), systemicFatigue };
    }

    const stallRec = detectStalls(history, exercises, t, profile);
    if (stallRec) return stallRec;

    const circadianRec = detectCircadianNudge(t);
    if (circadianRec) return circadianRec;

    const efficiencyRec = detectEfficiencyIssues(history);
    if (efficiencyRec) return efficiencyRec;

    if (isOnboardingPhase && customRoutines.length > 0) {
        if (history.length === 0) return { type: 'workout', titleKey: "rec_title_onboarding_complete", reasonKey: "rec_reason_onboarding_complete", suggestedBodyParts: [], relevantRoutineIds: [customRoutines[0].id], systemicFatigue };
        const lastRoutineIndex = customRoutines.findIndex(r => r.id === lastSession?.routineId);
        let nextIndex = lastRoutineIndex === -1 ? 0 : (lastRoutineIndex + 1) % customRoutines.length;
        if (customRoutines.length > 1 && customRoutines[nextIndex].id === lastSession?.routineId) nextIndex = (nextIndex + 1) % customRoutines.length;
        const nextRoutine = customRoutines[nextIndex];
        return { type: 'workout', titleKey: "rec_title_next_up", titleParams: { routine: nextRoutine.name }, reasonKey: "rec_reason_next_up", reasonParams: { routine: nextRoutine.name }, suggestedBodyParts: [], relevantRoutineIds: [nextRoutine.id], systemicFatigue };
    }

    const scores = Object.values(freshness), avgFreshness = scores.reduce((a, b) => a + b, 0) / (scores.length || 1), hasFreshMuscles = scores.some(s => s > 80), predictedNextRoutine = predictNextRoutine(history, routines);

    if ((avgFreshness < 60 && !hasFreshMuscles)) {
        const protectedMuscles = Object.entries(freshness).filter(([_, score]) => score < 50).map(([muscle]) => muscle as MuscleGroup);
        return { type: 'active_recovery', titleKey: "rec_title_gap_workout", reasonKey: "rec_reason_fatigued", suggestedBodyParts: ['Cardio', 'Mobility', 'Core'], relevantRoutineIds: [], generatedRoutine: generateGapSession(protectedMuscles, exercises, history, t, userProfile, freshness, currentBodyweight, profile), systemicFatigue };
    }

    const getGroupData = (id: string, muscleNames: string[], bodyParts: BodyPart[], focusKey: RoutineFocus) => {
        const groupScores = muscleNames.map(m => freshness[m] !== undefined ? freshness[m] : 100);
        const score = groupScores.reduce((a, b) => a + b, 0) / groupScores.length;
        let lastTrainedTime = 0;
        for (const session of history) {
            if (session.startTime <= lastTrainedTime) continue;
            let hitGroup = false;
            for (const ex of session.exercises) { if (exercises.find(e => e.id === ex.exerciseId)?.primaryMuscles?.some(m => muscleNames.includes(m))) { hitGroup = true; break; } }
            if (hitGroup) { lastTrainedTime = session.startTime; break; }
        }
        const daysSince = lastTrainedTime === 0 ? 999 : Math.floor((Date.now() - lastTrainedTime) / (1000 * 60 * 60 * 24));
        return { id, score, daysSince, bodyParts, focusKey };
    };

    const pushGroup = getGroupData('Push', PUSH_MUSCLES, ['Chest', 'Shoulders', 'Triceps'], 'push');
    const pullGroup = getGroupData('Pull', PULL_MUSCLES, ['Back', 'Biceps'], 'pull');
    const legsGroup = getGroupData('Legs', LEG_MUSCLES, ['Legs', 'Glutes', 'Calves'], 'legs');
    const fullBodyGroup = getGroupData('Full Body', FULL_BODY_MUSCLES, ['Full Body', 'Chest', 'Back', 'Legs'], 'full_body');
    const getHabitScore = (focusKey: RoutineFocus): number => {
        let score = 0, targetMuscles: string[] = [];
        if (focusKey === 'push') targetMuscles = PUSH_MUSCLES; else if (focusKey === 'pull') targetMuscles = PULL_MUSCLES; else if (focusKey === 'legs') targetMuscles = LEG_MUSCLES; else if (focusKey === 'full_body') targetMuscles = FULL_BODY_MUSCLES;
        Object.entries(exerciseFrequency).forEach(([exId, freq]) => { const def = exercises.find(e => e.id === exId) || PREDEFINED_EXERCISES.find(e => e.id === exId); if (def && def.primaryMuscles && def.primaryMuscles.some(m => targetMuscles.includes(m))) score += freq; });
        return score;
    };

    const groups = [pushGroup, pullGroup, legsGroup, fullBodyGroup];
    const readyGroups = groups.filter(g => {
        // Bio-Adaptive Modification: Threshold Delta
        // If user is highly efficient (density > avg), lower freshness threshold to 70%
        let threshold = 80;
        if (profile?.bioAdaptiveEngine && history.length >= 2) {
            const efficiency = calculateLifterDNA(history).efficiencyScore;
            if (efficiency > 110) threshold = 70;
        }
        if (g.daysSince < 2) return false;
        return g.score > threshold;
    });

    if (predictedNextRoutine) {
        const predictedFocus = predictedNextRoutine.name.toLowerCase();
        const matchingGroup = readyGroups.find(g => predictedFocus.includes(g.id.toLowerCase().replace('_', ' ')));
        if (matchingGroup) return { type: 'workout', titleKey: "rec_title_next_up", titleParams: { routine: predictedNextRoutine.name }, reasonKey: "rec_reason_fresh", reasonParams: { muscles: matchingGroup.bodyParts[0], days: matchingGroup.daysSince.toString() }, suggestedBodyParts: matchingGroup.bodyParts, relevantRoutineIds: [predictedNextRoutine.id], systemicFatigue };
    }

    if (readyGroups.length > 0) {
        readyGroups.sort((a, b) => { const daysDiff = b.daysSince - a.daysSince; if (Math.abs(daysDiff) > 2) return daysDiff; const habitA = getHabitScore(a.focusKey), habitB = getHabitScore(b.focusKey); return habitB - habitA; });
        const winner = readyGroups[0];
        let titleKey = 'rec_title_generic';
        if (winner.id === 'Push') titleKey = 'rec_title_push'; if (winner.id === 'Pull') titleKey = 'rec_title_pull'; if (winner.id === 'Legs') titleKey = 'rec_title_legs';
        let relevantRoutineIds: string[] = [], generatedRoutine: Routine | undefined = undefined, reasonKey = winner.daysSince > 4 ? 'rec_reason_neglected' : 'rec_reason_fresh', titleParams: Record<string, string> = { focus: winner.id };
        const scoredRoutines = routines.map(r => {
            let score = 0, matchCount = 0;
            r.exercises.forEach(ex => { const def = exercises.find(e => e.id === ex.exerciseId) || PREDEFINED_EXERCISES.find(e => e.id === ex.exerciseId); if (def) { if (winner.id === 'Full Body') { if (['Chest', 'Back', 'Legs', 'Shoulders'].includes(def.bodyPart)) matchCount++; } else { if (winner.bodyParts.includes(def.bodyPart)) matchCount++; } } });
            const matchRatio = r.exercises.length > 0 ? matchCount / r.exercises.length : 0;
            if (matchRatio < 0.3) return { r, score: -10 };
            score += matchRatio * 20;
            const freq = routineFrequency[r.id] || 0;
            score += Math.min(20, freq * 2);
            if (r.name.toLowerCase().includes(winner.id.toLowerCase())) score += 10;
            if (!r.id.startsWith('rt-')) score += 5;
            if (lastSession && r.id === lastSession.routineId) score -= 50;
            return { r, score };
        });
        const validScored = scoredRoutines.filter(x => x.score > 10);
        validScored.sort((a, b) => b.score - a.score);
        relevantRoutineIds = validScored.slice(0, 2).map(x => x.r.id);
        if (!isOnboardingPhase) generatedRoutine = generateSmartRoutine(winner.focusKey, userProfile, t, exercises, exerciseFrequency);
        const daysText = winner.daysSince === 999 ? t('common_many') : winner.daysSince.toString();
        return { type: 'workout', titleKey, titleParams, reasonKey, reasonParams: { muscles: winner.bodyParts[0], days: daysText, focus: winner.id }, suggestedBodyParts: winner.bodyParts, relevantRoutineIds, generatedRoutine, systemicFatigue };
    }
    return { type: 'active_recovery', titleKey: "rec_title_generic", titleParams: { focus: 'Cardio / Mobility' }, reasonKey: "rec_reason_fatigued", suggestedBodyParts: ['Cardio', 'Mobility'], relevantRoutineIds: routines.filter(r => r.routineType === 'hiit' || r.name.includes('Cardio')).map(r => r.id), generatedRoutine: generateGapSession([], exercises, history, t, userProfile, freshness, currentBodyweight, profile), systemicFatigue };
};
