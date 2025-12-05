
import { SupplementInfo, SupplementPlan, SupplementPlanItem, WorkoutSession, SupplementSuggestion } from '../types';
import { getExplanationIdForSupplement } from './explanationService';
import { PREDEFINED_EXERCISES } from '../constants/exercises';
import { getDateString } from '../utils/timeUtils';

// Sort helper - Lower number means earlier in the day
const timeOrder: { [key: string]: number } = {
    'supplements_time_pre_workout': 0.5,
    'supplements_time_morning': 1,
    'supplements_time_morning_with_meal': 1.1,
    'supplements_time_with_breakfast': 1.2,
    'supplements_time_intra_workout': 2.5,
    'supplements_time_post_workout': 3,
    'supplements_time_lunch': 3.5,
    'supplements_time_with_meal': 4,
    'supplements_time_evening': 5,
    'supplements_time_before_bed': 5.1,
    'supplements_time_daily': 6,
    'supplements_time_daily_any': 6
};

const getTimeKey = (time: string): string => {
    // Now expecting keys directly, but keep loose matching for robustness or legacy custom strings
    if (time === 'supplements_time_morning' || time.includes('Morning')) return 'supplements_time_morning';
    if (time === 'supplements_time_pre_workout' || time.includes('Pre-workout')) return 'supplements_time_pre_workout';
    if (time === 'supplements_time_intra_workout' || time.includes('Intra-workout')) return 'supplements_time_intra_workout';
    if (time === 'supplements_time_post_workout' || time.includes('Post-workout')) return 'supplements_time_post_workout';
    if (time === 'supplements_time_lunch' || time.includes('Lunch') || time.includes('Almuerzo')) return 'supplements_time_lunch';
    if (time === 'supplements_time_evening' || time.includes('Evening')) return 'supplements_time_evening';
    if (time === 'supplements_time_with_meal' || time.includes('meal')) return 'supplements_time_with_meal';
    // Return the key itself if it's a known key, otherwise default
    if (timeOrder[time]) return time;
    return 'supplements_time_daily';
}


export const generateSupplementPlan = (info: SupplementInfo, t: (key: string, replacements?: Record<string, string | number>) => string, customSupplements: SupplementPlanItem[]): SupplementPlan => {
    const plan: SupplementPlanItem[] = [];
    const warnings: string[] = [];
    const general_tips: string[] = [];

    // --- Helper variables ---
    const birthDate = new Date(info.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    const bmi = info.weight / ((info.height / 100) ** 2);
    const nivel = info.activityLevel === 'beginner' ? 1 : info.activityLevel === 'intermediate' ? 2 : 3;
    const objetivo = info.objective === 'gain' ? 1 : info.objective === 'lose' ? 2 : 3;
    const dieta_prot = info.proteinConsumption === 'unknown' ? info.weight * 1.2 : (info.proteinConsumption as number);
    const numTrainingDays = info.trainingDays.length;

    // --- Health Conditions & Allergies ---
    const hasKidneyIssues = info.medicalConditions && /kidney|renal/i.test(info.medicalConditions);
    const hasHypertension = info.medicalConditions && /pressure|hypertension/i.test(info.medicalConditions);
    const isLactoseIntolerant = info.allergies.some(a => /lactose|dairy/i.test(a));
    const isVegan = info.allergies.some(a => /vegan/i.test(a));

    if (hasKidneyIssues) {
        warnings.push(t('supplements_warning_kidney'));
    }
    if (hasHypertension) {
        warnings.push(t('supplements_warning_hypertension'));
    }

    // --- Calculations ---

    // Check if the user already has a combined Protein + EAA item in their custom list
    // Robust check: Look for keywords "protein" AND "eaa" (or "bcaa") in the name
    const hasCombinedProteinEaa = customSupplements.some(item => {
        const name = item.supplement.toLowerCase();
        return name.includes('protein') && (name.includes('eaa') || name.includes('bcaa'));
    });

    // 1. Protein
    let prot_total_needed_factor = 1.6;
    if (objetivo === 1) prot_total_needed_factor = 2.0; // Gain
    if (objetivo === 2) prot_total_needed_factor = 2.2; // Lose
    if (numTrainingDays >= 4) prot_total_needed_factor += 0.2; // Adjust for more training days
    if (info.gender === 'female') prot_total_needed_factor -= 0.2;

    const prot_total_needed = Math.max(1.6, Math.min(2.2, prot_total_needed_factor)) * info.weight;
    
    let whey_needed = prot_total_needed - dieta_prot;
    
    if ((isVegan && whey_needed > 15) || whey_needed > 15 || info.desiredSupplements.some(s => /protein|whey/i.test(s))) {
        let proteinType = t('supplements_name_whey');
        if (isLactoseIntolerant) proteinType = t('supplements_name_whey_isolate');
        if (isVegan) proteinType = t('supplements_name_plant_protein');
        
        // Cap at 3 servings from shakes
        whey_needed = Math.min(120, whey_needed);
        let doses = Math.ceil(whey_needed / 40);
        doses = Math.max(1, Math.min(3, doses));

        const dosagePerServing = Math.round(whey_needed / doses);
        
        if (doses > 0 && dosagePerServing > 10) {
            // DOSE 1: SPLIT SCHEDULE (Training vs Rest)
            // Item 1A: Training Days (Post-Workout)
            plan.push({
                id: `gen-protein-1-train-${Date.now()}`,
                time: 'supplements_time_post_workout',
                supplement: proteinType,
                dosage: `~${dosagePerServing}g`,
                notes: t('supplements_note_protein_post_workout') + ' ' + t('supplements_note_protein_dose', { doseNum: 1, totalDoses: doses, goal: Math.round(prot_total_needed) }),
                trainingDayOnly: true,
            });

            // Item 1B: Rest Days (Morning/Breakfast) - Ensures the user takes it every day, but at different times
            plan.push({
                id: `gen-protein-1-rest-${Date.now()}`,
                time: 'supplements_time_with_breakfast',
                supplement: proteinType,
                dosage: `~${dosagePerServing}g`,
                notes: t('supplements_note_protein_breakfast') + ' ' + t('supplements_note_protein_dose', { doseNum: 1, totalDoses: doses, goal: Math.round(prot_total_needed) }),
                restDayOnly: true,
            });

            // Dose 2: With Lunch (Daily) - If they need a lot of protein
            if (doses >= 2) {
                // If they train in morning, Dose 1 (Train) is Post-Workout (Morning), Dose 1 (Rest) is Breakfast.
                // Dose 2 at Lunch is fine for both.
                plan.push({
                    id: `gen-protein-2-${Date.now()}`,
                    time: 'supplements_time_lunch',
                    supplement: proteinType,
                    dosage: `~${dosagePerServing}g`,
                    notes: t('supplements_note_protein_lunch') + ' ' + t('supplements_note_protein_dose', { doseNum: 2, totalDoses: doses, goal: Math.round(prot_total_needed) }),
                });
            }

            // Dose 3: Before Bed
            if (doses >= 3) {
                 plan.push({
                    id: `gen-protein-3-${Date.now()}`,
                    time: 'supplements_time_before_bed',
                    supplement: proteinType,
                    dosage: `~${dosagePerServing}g`,
                    notes: t('supplements_note_protein_bedtime') + ' ' + t('supplements_note_protein_dose', { doseNum: 3, totalDoses: doses, goal: Math.round(prot_total_needed) }),
                });
            }
        }
    }

    // 2. Creatine
    if ((info.routineType === 'strength' || info.routineType === 'mixed' || info.desiredSupplements.some(s => /creatine/i.test(s))) && !hasKidneyIssues) {
        let dosis_creatina = 0.03 * info.weight + (nivel - 1) * 1;
        dosis_creatina = Math.max(3, Math.min(5, dosis_creatina));
        if (objetivo === 2) dosis_creatina = Math.max(3, dosis_creatina - 1);
        if (age > 40) dosis_creatina += 1;
        dosis_creatina = Math.round(Math.min(5, dosis_creatina));

        // Split Schedule for Creatine
        // Item A: Training Days (Post-Workout)
        plan.push({
            id: `gen-creatine-train-${Date.now()}`,
            time: 'supplements_time_post_workout',
            supplement: t('supplements_name_creatine'),
            dosage: `${dosis_creatina}g`,
            notes: t('supplements_note_creatine'),
            trainingDayOnly: true
        });

        // Item B: Rest Days (Morning/Breakfast)
        plan.push({
            id: `gen-creatine-rest-${Date.now()}`,
            time: 'supplements_time_with_breakfast',
            supplement: t('supplements_name_creatine'),
            dosage: `${dosis_creatina}g`,
            notes: t('supplements_note_creatine'),
            restDayOnly: true
        });
    }
    
    // 3. Omega-3
    if (age > 35 || objetivo === 2 || info.desiredSupplements.some(s => /omega/i.test(s))) {
        let dosis_omega = 1 + (age > 40 ? 0.5 : 0) + (objetivo === 2 ? 0.5 : 0);
        dosis_omega = Math.min(3, dosis_omega);
        plan.push({
            id: `gen-omega3-${Date.now()}`,
            time: 'supplements_time_with_meal',
            supplement: isVegan ? t('supplements_name_omega_algae') : t('supplements_name_omega_fish'),
            dosage: `${dosis_omega.toFixed(1)}g EPA+DHA`,
            notes: t('supplements_note_omega')
        });
    }
    
    // 4. Vitamin D3
    if (age > 35 || info.deficiencies.some(d => /vitamin d|vit d/i.test(d)) || info.desiredSupplements.some(s => /vitamin d|vit d/i.test(s))) {
        let dosis_vitd = 1000;
        if (info.deficiencies.some(d => /vitamin d|vit d/i.test(d))) dosis_vitd = 2000;
        if (age > 40) dosis_vitd += 500;
        if (bmi > 25) dosis_vitd += 500;
        dosis_vitd = Math.min(4000, Math.round(dosis_vitd/500)*500);

        plan.push({
            id: `gen-vitd3-${Date.now()}`,
            time: 'supplements_time_morning_with_meal',
            supplement: t('supplements_name_vit_d3'),
            dosage: `${dosis_vitd} IU`,
            notes: t('supplements_note_vit_d3')
        });
    }
    
    // 5. Magnesium
    if (nivel > 1 || age > 35 || info.deficiencies.some(d => /magnesium|mg/i.test(d)) || info.desiredSupplements.some(s => /magnesium|mg/i.test(s))) {
        let dosis_mg = info.gender === 'male' ? 350 : 300;
        if (nivel > 2) dosis_mg += 50;
        dosis_mg = Math.min(info.gender === 'male' ? 420 : 320, dosis_mg);
        dosis_mg = Math.round(dosis_mg / 50) * 50;

        plan.push({
            id: `gen-magnesium-${Date.now()}`,
            time: 'supplements_time_before_bed',
            supplement: t('supplements_name_magnesium'),
            dosage: `${dosis_mg}mg`,
            notes: t('supplements_note_magnesium')
        });
    }

    // 6. Beta-Alanine
    if ((info.routineType === 'strength' || info.routineType === 'mixed') && (nivel > 1 || info.desiredSupplements.some(s => /beta alanine|beta-alanine/i.test(s)))) {
        let dosis_beta = 0.04 * info.weight;
        dosis_beta = Math.max(2, Math.min(5, dosis_beta));
        const rounded_dosis_beta = Math.round(dosis_beta);

        let notes = t('supplements_note_beta_alanine');
        if (rounded_dosis_beta > 3) {
            notes += t('supplements_note_beta_alanine_split', { dose: Math.floor(rounded_dosis_beta/2) })
        }
        plan.push({
            id: `gen-betaalanine-${Date.now()}`,
            time: 'supplements_time_pre_workout',
            supplement: t('supplements_name_beta_alanine'),
            dosage: `${rounded_dosis_beta}g`,
            notes: notes,
            trainingDayOnly: true,
        });
    }

    // 7. Caffeine
    if ((info.routineType !== 'cardio' && nivel > 1 && !hasHypertension) || info.desiredSupplements.some(s => /caffeine|pre-workout/i.test(s))) {
        let dosis_caffeine = (3 * info.weight) / 20 + (nivel > 2 ? 50 : 0);
        dosis_caffeine = Math.max(100, Math.min(300, dosis_caffeine));
        dosis_caffeine = Math.round(dosis_caffeine / 50) * 50;
        plan.push({
            id: `gen-caffeine-${Date.now()}`,
            time: 'supplements_time_pre_workout',
            supplement: t('supplements_name_caffeine'),
            dosage: `${dosis_caffeine}mg`,
            notes: t('supplements_note_caffeine'),
            trainingDayOnly: true,
        });
    }


    // General Tips
    if (info.hydration < 2.5) {
        general_tips.push(t('supplements_tip_hydration'));
    }
    general_tips.push(t('supplements_tip_consistency'));
    general_tips.push(t('supplements_tip_complement'));
    if (whey_needed > 10) {
        general_tips.push(t('supplements_tip_whole_foods'));
    }

    // Filter out generated items that are already in custom list to prevent duplication
    const filteredPlan = plan.filter(p => !customSupplements.some(c => c.supplement === p.supplement));

    // Merge with custom supplements
    const finalPlan = [...filteredPlan, ...customSupplements];

    // Sort plan
    finalPlan.sort((a, b) => {
        const keyA = getTimeKey(a.time);
        const keyB = getTimeKey(b.time);
        return (timeOrder[keyA] || 99) - (timeOrder[keyB] || 99);
    });

    return {
        info,
        plan: finalPlan,
        warnings,
        general_tips,
        createdAt: Date.now()
    };
};

// ... existing code for analysis functions (analyzeVolumeDrop, checkStimulantTolerance, etc.)
export const analyzeVolumeDrop = (history: WorkoutSession[]): boolean => {
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentHistory = history.filter(s => s.startTime > fourWeeksAgo.getTime());

    if (recentHistory.length < 3) {
        return false;
    }

    const last2WeeksHistory = recentHistory.filter(s => s.startTime > twoWeeksAgo.getTime());
    const prev2WeeksHistory = recentHistory.filter(s => s.startTime <= twoWeeksAgo.getTime() && s.startTime > fourWeeksAgo.getTime());
    
    const volLast2 = last2WeeksHistory.reduce((acc, s) => acc + s.exercises.reduce((t, e) => t + e.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0), 0);
    const volPrev2 = prev2WeeksHistory.reduce((acc, s) => acc + s.exercises.reduce((t, e) => t + e.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0), 0);
    
    const volumeDropRatio = volPrev2 > 0 ? volLast2 / volPrev2 : 1;
    return volumeDropRatio < 0.5 && prev2WeeksHistory.length > 0;
}

const checkStimulantTolerance = (
    takenSupplements: Record<string, string[]>,
    allSupplements: SupplementPlanItem[],
    t: (key: string) => string
): SupplementSuggestion | null => {
    const now = new Date();
    const EIGHT_WEEKS_DAYS = 56;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    // 1. Identify stimulant supplements (Caffeine or Pre-workout)
    const stimulantIds = allSupplements
        .filter(item => {
            const explanationId = getExplanationIdForSupplement(item.supplement);
            return explanationId === 'caffeine' || 
                   item.supplement.toLowerCase().includes('pre-workout') ||
                   item.supplement.toLowerCase().includes('pre-entreno');
        })
        .map(item => item.id);

    if (stimulantIds.length === 0) return null;

    // 2. Check usage history for the last 8 weeks
    // We analyze consistency. Let's say "Consistent" means taking it at least once every week for 8 weeks straight.
    let consistentWeeks = 0;

    for (let i = 0; i < 8; i++) {
        let takenThisWeek = false;
        // Check each day in the week window
        for (let j = 0; j < 7; j++) {
            const dateToCheck = new Date(now.getTime() - ((i * 7) + j) * ONE_DAY_MS);
            const dateStr = getDateString(dateToCheck);
            const takenOnDay = takenSupplements[dateStr] || [];
            
            if (takenOnDay.some(id => stimulantIds.includes(id))) {
                takenThisWeek = true;
                break; 
            }
        }
        if (takenThisWeek) {
            consistentWeeks++;
        }
    }

    if (consistentWeeks >= 8) {
         const itemToRemove = allSupplements.find(item => stimulantIds.includes(item.id));
         if (!itemToRemove) return null;

         return {
            id: 'stimulant-tolerance-break',
            title: t('suggestion_caffeine_deload_title'),
            reason: t('suggestion_caffeine_deload_reason'),
            identifier: `REMOVE:${itemToRemove.supplement}:tolerance`,
            action: { type: 'REMOVE', itemId: itemToRemove.id }
        };
    }

    return null;
};

const checkStockLevels = (plan: SupplementPlan, t: (key: string, replacements?: Record<string, string | number>) => string): SupplementSuggestion[] => {
    const suggestions: SupplementSuggestion[] = [];
    
    plan.plan.forEach(item => {
        if (item.stock !== undefined && item.stock <= 5 && item.stock > 0) {
            suggestions.push({
                id: `restock-${item.id}`,
                title: t('suggestion_restock_title', { supplement: item.supplement }),
                reason: t('suggestion_restock_reason', { count: item.stock }),
                identifier: `UPDATE:${item.supplement}:restock`,
                action: {
                    type: 'UPDATE',
                    itemId: item.id,
                    updates: { stock: item.stock + 30 } // Suggest adding standard 30 servings
                }
            });
        }
    });
    
    return suggestions;
};

// --- DRIFT DETECTION ---

const getBucketForHour = (hour: number): string => {
    if (hour >= 4 && hour < 11) return 'supplements_time_morning';
    if (hour >= 11 && hour < 14) return 'supplements_time_lunch';
    if (hour >= 14 && hour < 19) return 'supplements_time_afternoon';
    return 'supplements_time_evening'; // 19:00 - 04:00
}

const checkScheduleDrift = (
    plan: SupplementPlan,
    supplementLogs: Record<string, number[]>,
    t: (key: string, replacements?: Record<string, string | number>) => string
): SupplementSuggestion[] => {
    const suggestions: SupplementSuggestion[] = [];
    const MIN_LOGS = 5;
    const CONSISTENCY_THRESHOLD = 0.75;
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    plan.plan.forEach(item => {
        const logs = supplementLogs[item.id];
        if (!logs || logs.length < MIN_LOGS) return;
        
        // Filter recent logs
        const recentLogs = logs.filter(ts => (now - ts) < TWO_WEEKS_MS);
        if (recentLogs.length < MIN_LOGS) return;

        const bucketCounts: Record<string, number> = {};
        
        recentLogs.forEach(ts => {
            const date = new Date(ts);
            const hour = date.getHours();
            const bucket = getBucketForHour(hour);
            bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
        });
        
        // Find dominant bucket
        let dominantBucket = '';
        let maxCount = 0;
        
        Object.entries(bucketCounts).forEach(([bucket, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantBucket = bucket;
            }
        });
        
        const consistency = maxCount / recentLogs.length;

        // If consistent and different from plan time
        const currentPlanBucket = getBucketFromPlanTime(item.time);

        if (consistency >= CONSISTENCY_THRESHOLD && dominantBucket !== currentPlanBucket) {
            // Avoid suggesting changing "Morning" to "Morning with meal", too granular.
            // Only suggest shifts between major blocks (Morning -> Afternoon).
            if (dominantBucket !== item.time) {
                 suggestions.push({
                    id: `drift-${item.id}`,
                    title: t('suggestion_drift_title'),
                    reason: t('suggestion_drift_reason', { supplement: item.supplement, time: t(dominantBucket as any).toLowerCase() }),
                    identifier: `UPDATE:${item.supplement}:time:${dominantBucket}`,
                    action: {
                        type: 'UPDATE',
                        itemId: item.id,
                        updates: { time: dominantBucket }
                    }
                });
            }
        }
    });
    
    return suggestions;
}

const getBucketFromPlanTime = (planTimeKey: string): string => {
    if (planTimeKey.includes('morning') || planTimeKey.includes('breakfast')) return 'supplements_time_morning';
    if (planTimeKey.includes('lunch')) return 'supplements_time_lunch';
    if (planTimeKey.includes('afternoon') || planTimeKey.includes('intra_workout')) return 'supplements_time_afternoon'; // Approx
    if (planTimeKey.includes('evening') || planTimeKey.includes('bed')) return 'supplements_time_evening';
    // Default fallback for ambiguous ones
    return planTimeKey; 
}

export const reviewSupplementPlan = (
  plan: SupplementPlan, 
  history: WorkoutSession[], 
  t: (key: string, replacements?: Record<string, string | number>) => string,
  volumeDropReason?: 'busy' | 'deload' | 'injury' | null,
  takenSupplements?: Record<string, string[]>,
  supplementLogs?: Record<string, number[]>
): SupplementSuggestion[] => {
    const suggestions: SupplementSuggestion[] = [];
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentHistory = history.filter(s => s.startTime > fourWeeksAgo.getTime());
    
    // --- STOCK CHECK ---
    suggestions.push(...checkStockLevels(plan, t));

    // --- DRIFT CHECK ---
    if (supplementLogs) {
        suggestions.push(...checkScheduleDrift(plan, supplementLogs, t));
    }

    if (recentHistory.length < 3) {
        return suggestions; 
    }

    // --- METRICS CALCULATION ---

    // 1. Volume Calculation (Last 4 weeks)
    const totalVolumeLast4Weeks = recentHistory.reduce((total, session) => {
        return total + session.exercises.reduce((sessionTotal, ex) => {
            return sessionTotal + ex.sets.reduce((exTotal, set) => exTotal + (set.weight * set.reps), 0);
        }, 0);
    }, 0);
    const avgWeeklyVolume = totalVolumeLast4Weeks / 4;

    // 2. Duration Analysis
    const longSessions = recentHistory.filter(s => s.endTime > 0 && (s.endTime - s.startTime) > 80 * 60 * 1000);
    const isLongDurationUser = longSessions.length > (recentHistory.length * 0.4);

    // 3. Time of Day Analysis
    let lateNightWorkouts = 0;
    let earlyMorningWorkouts = 0;
    let morningCount = 0;
    let afternoonCount = 0;
    let nightCount = 0;
    
    recentHistory.forEach(s => {
        const hour = new Date(s.startTime).getHours();
        if (hour >= 20) lateNightWorkouts++;
        if (hour < 9) earlyMorningWorkouts++;
        
        if (hour >= 4 && hour < 11) morningCount++;
        else if (hour >= 11 && hour < 18) afternoonCount++;
        else nightCount++;
    });
    
    const isLateNightUser = lateNightWorkouts > (recentHistory.length * 0.3);
    const isEarlyMorningUser = earlyMorningWorkouts > (recentHistory.length * 0.5);

    let mostFrequentTrainingTime: 'morning' | 'afternoon' | 'night' = 'afternoon';
    if (morningCount > afternoonCount && morningCount > nightCount) mostFrequentTrainingTime = 'morning';
    else if (nightCount > afternoonCount && nightCount > morningCount) mostFrequentTrainingTime = 'night';

    // 4. High Impact / Heavy Joint Load
    let highImpactCount = 0;
    let totalExercises = 0;
    
    recentHistory.forEach(s => {
        s.exercises.forEach(we => {
            totalExercises++;
            const exDef = PREDEFINED_EXERCISES.find(e => e.id === we.exerciseId);
            if (exDef) {
                if (['Cardio', 'Plyometrics'].includes(exDef.category)) highImpactCount++;
                if (exDef.bodyPart === 'Legs' || exDef.bodyPart === 'Back') {
                    if (exDef.category === 'Barbell') highImpactCount++;
                }
            }
        });
    });
    const isHighImpactUser = totalExercises > 0 && (highImpactCount / totalExercises) > 0.3;

    // 5. Stagnation (Volume Trend) & Drop Detection
    const last2WeeksHistory = recentHistory.filter(s => s.startTime > twoWeeksAgo.getTime());
    const prev2WeeksHistory = recentHistory.filter(s => s.startTime <= twoWeeksAgo.getTime() && s.startTime > fourWeeksAgo.getTime());
    
    const volLast2 = last2WeeksHistory.reduce((acc, s) => acc + s.exercises.reduce((t, e) => t + e.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0), 0);
    const volPrev2 = prev2WeeksHistory.reduce((acc, s) => acc + s.exercises.reduce((t, e) => t + e.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0), 0);
    
    const isStagnating = last2WeeksHistory.length >= 2 && prev2WeeksHistory.length >= 2 && volLast2 <= volPrev2 * 1.05 && volLast2 >= volPrev2 * 0.95;
    const volumeDropRatio = volPrev2 > 0 ? volLast2 / volPrev2 : 1;
    const isSignificantVolumeDrop = volumeDropRatio < 0.5 && prev2WeeksHistory.length > 0;

    // 6. Workout Density (Volume / Minute)
    let totalDensity = 0;
    let densityCount = 0;
    recentHistory.forEach(s => {
        if (s.endTime > s.startTime) {
            const durationMinutes = (s.endTime - s.startTime) / 60000;
            if (durationMinutes > 10) {
                const volume = s.exercises.reduce((t, ex) => t + ex.sets.reduce((st, set) => st + set.weight * set.reps, 0), 0);
                totalDensity += volume / durationMinutes;
                densityCount++;
            }
        }
    });
    const avgDensity = densityCount > 0 ? totalDensity / densityCount : 0;
    const isHighDensity = avgDensity > 250; // Heuristic threshold

    // 7. Training Frequency (Consecutive Days)
    const sortedSessions = [...recentHistory].sort((a, b) => a.startTime - b.startTime);
    let maxStreak = 0;
    let currentStreak = 1;
    let streak3PlusCount = 0;

    for (let i = 1; i < sortedSessions.length; i++) {
        const prevDate = new Date(sortedSessions[i-1].startTime);
        const currDate = new Date(sortedSessions[i].startTime);
        
        // Reset time to compare dates only
        prevDate.setHours(0,0,0,0);
        currDate.setHours(0,0,0,0);
        
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            currentStreak++;
        } else if (diffDays > 1) {
            if (currentStreak >= 3) streak3PlusCount++;
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
        }
    }
    if (currentStreak >= 3) streak3PlusCount++;
    const isHighFrequency = streak3PlusCount >= 2;

    // Average Weekly Sessions (Frequency)
    const weeksActive = 4; // Analyzing last 4 weeks
    const avgWeeklySessions = recentHistory.length / weeksActive;


    // --- GENERATING SUGGESTIONS ---
    const combinedProteinName = t('supplements_name_protein_with_eaa');
    
    // Check if the user already has a combined Protein + EAA item in their custom list
    // Robust check: Look for keywords "protein" AND "eaa" (or "bcaa") in the name
    const hasCombinedProteinEaa = plan.plan.some(item => {
        const name = item.supplement.toLowerCase();
        return item.supplement === combinedProteinName || (name.includes('protein') && (name.includes('eaa') || name.includes('bcaa')));
    });

    const isStrengthTraining = plan.info.routineType === 'strength' || plan.info.routineType === 'mixed';
    
    // Suggestion 1: Add Creatine (Addition)
    const hasCreatine = plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'creatine');
    const creatineName = t('supplements_name_creatine');
    if (isStrengthTraining && !hasCreatine && avgWeeklyVolume > 15000) {
        const dose = Math.round(Math.min(5, Math.max(3, 0.03 * plan.info.weight)));
        suggestions.push({
            id: 'add-creatine-volume',
            title: t('suggestion_add_creatine_title'),
            reason: t('suggestion_add_creatine_reason_volume'),
            identifier: `ADD:${creatineName}`,
            action: {
                type: 'ADD',
                item: {
                    id: `gen-creatine-${Date.now()}`,
                    supplement: creatineName,
                    dosage: `${dose}g`,
                    time: 'supplements_time_post_workout', // Default to post workout, but user can edit
                    notes: t('supplements_note_creatine'),
                    trainingDayOnly: true // Default to Training day only for new add
                }
            }
        });
    }

    // Suggestion 2: Increase Protein (Addition)
    const proteinItems = plan.plan.filter(item => getExplanationIdForSupplement(item.supplement) === 'protein');
    if (plan.info.objective === 'gain' && avgWeeklyVolume > 20000 && proteinItems.length > 0) {
        const firstProteinItem = proteinItems[0];
        const currentDosage = parseInt(firstProteinItem.dosage.replace(/[^0-9]/g, ''), 10);
        if (currentDosage > 0 && currentDosage < 40) {
            const newDosage = Math.round(currentDosage * 1.25 / 5) * 5;
            const increaseAmount = newDosage - currentDosage;
            if (increaseAmount > 0) {
              suggestions.push({
                  id: 'increase-protein-gain',
                  title: t('suggestion_increase_protein_title'),
                  reason: t('suggestion_increase_protein_reason_gain'),
                  identifier: `UPDATE:${firstProteinItem.supplement}:dosage:increase:${increaseAmount}g`,
                  action: {
                      type: 'UPDATE',
                      itemId: firstProteinItem.id,
                      updates: { dosage: `~${newDosage}g` }
                  }
              });
            }
        }
    }

    // Suggestion 3: Remove Late Caffeine (Behavior Check)
    const caffeineItem = plan.plan.find(item => getExplanationIdForSupplement(item.supplement) === 'caffeine');
    const caffeineName = t('supplements_name_caffeine');
    if (caffeineItem && isLateNightUser) {
        suggestions.push({
            id: 'remove-caffeine-late',
            title: t('suggestion_remove_caffeine_title'),
            reason: t('suggestion_remove_caffeine_reason_late'),
            identifier: `REMOVE:${caffeineName}`,
            action: { type: 'REMOVE', itemId: caffeineItem.id }
        });
    }

    // Suggestion 4: Electrolytes (Addition)
    const hasElectrolytes = plan.plan.some(item => item.supplement.toLowerCase().includes('electrolyte') || item.supplement.includes('Intra'));
    if (isLongDurationUser && !hasElectrolytes) {
        const electrolytesName = t('supplements_name_electrolytes');
        suggestions.push({
            id: 'add-electrolytes-long',
            title: t('suggestion_add_electrolytes_title'),
            reason: t('suggestion_add_electrolytes_reason'),
            identifier: `ADD:${electrolytesName}`,
            action: {
                type: 'ADD',
                item: {
                    id: `gen-electrolytes-${Date.now()}`,
                    supplement: electrolytesName,
                    dosage: '1 serving',
                    time: 'supplements_time_intra_workout',
                    notes: t('supplements_note_electrolytes'),
                    trainingDayOnly: true
                }
            }
        });
    }

    // Suggestion 5: Joint Support (Addition)
    const hasJointSupport = plan.plan.some(item => item.supplement.toLowerCase().includes('joint') || item.supplement.includes('Collagen'));
    if ((isHighImpactUser && !hasJointSupport) || (volumeDropReason === 'injury' && !hasJointSupport)) {
        const jointName = t('supplements_name_joint_support');
        suggestions.push({
            id: 'add-joint-support',
            title: t('suggestion_add_joint_support_title'),
            reason: t('suggestion_add_joint_support_reason'),
            identifier: `ADD:${jointName}`,
            action: {
                type: 'ADD',
                item: {
                    id: `gen-joint-${Date.now()}`,
                    supplement: jointName,
                    dosage: '1 serving',
                    time: 'supplements_time_with_meal',
                    notes: t('supplements_note_joint_support'),
                }
            }
        });
    }

    // Suggestion 6: Citrulline for Stagnation (Addition)
    const hasCitrulline = plan.plan.some(item => item.supplement.toLowerCase().includes('citrulline'));
    if (isStagnating && !hasCitrulline && isStrengthTraining) {
        const citrullineName = t('supplements_name_citrulline');
        suggestions.push({
            id: 'add-citrulline-plateau',
            title: t('suggestion_add_citrulline_title'),
            reason: t('suggestion_add_citrulline_reason'),
            identifier: `ADD:${citrullineName}`,
            action: {
                type: 'ADD',
                item: {
                    id: `gen-citrulline-${Date.now()}`,
                    supplement: citrullineName,
                    dosage: '6g',
                    time: 'supplements_time_pre_workout',
                    notes: t('supplements_note_citrulline'),
                    trainingDayOnly: true
                }
            }
        });
    }

    // Suggestion 7: EAAs for High Density (Addition)
    const hasEAA = plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'eaa');
    const eaaName = t('supplements_name_eaa');
    if (isHighDensity && !hasEAA && !hasCombinedProteinEaa) {
        suggestions.push({
            id: 'add-eaa-density',
            title: t('suggestion_add_eaa_density_title'),
            reason: t('suggestion_add_eaa_density_reason'),
            identifier: `ADD:${eaaName}`,
            action: {
                type: 'ADD',
                item: {
                    id: `gen-eaa-${Date.now()}`,
                    supplement: eaaName,
                    dosage: '1 serving',
                    time: 'supplements_time_intra_workout',
                    notes: t('supplements_note_eaa'),
                    trainingDayOnly: true
                }
            }
        });
    }

    // Suggestion 8: ZMA for High Frequency (Addition)
    const hasZMA = plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'zma');
    const zmaName = t('supplements_name_zma');
    if (isHighFrequency && !hasZMA) {
        suggestions.push({
            id: 'add-zma-frequency',
            title: t('suggestion_add_zma_frequency_title'),
            reason: t('suggestion_add_zma_frequency_reason'),
            identifier: `ADD:${zmaName}`,
            action: {
                type: 'ADD',
                item: {
                    id: `gen-zma-${Date.now()}`,
                    supplement: zmaName,
                    dosage: '1 serving',
                    time: 'supplements_time_before_bed',
                    notes: t('supplements_note_zma'),
                }
            }
        });
    }

    // Suggestion 9: BCAAs/EAAs for Early Morning (Fasted) Training
    if (isEarlyMorningUser && !hasEAA && !hasCombinedProteinEaa) {
        suggestions.push({
            id: 'add-bcaa-morning',
            title: t('suggestion_add_bcaa_morning_title'),
            reason: t('suggestion_add_bcaa_morning_reason'),
            identifier: `ADD:${eaaName}:morning`, // unique identifier distinction
            action: {
                type: 'ADD',
                item: {
                    id: `gen-bcaa-morning-${Date.now()}`,
                    supplement: eaaName,
                    dosage: '1 serving',
                    time: 'supplements_time_pre_workout',
                    notes: t('supplements_note_eaa'),
                    trainingDayOnly: true
                }
            }
        });
    }

    // --- REMOVAL / REDUCTION SUGGESTIONS ---

    // Suggestion 10: Reduce Protein (Reduction)
    if (avgWeeklyVolume < 5000 || volumeDropRatio < 0.6) {
        const firstProteinItem = proteinItems[0];
        if (firstProteinItem) {
            const currentDosage = parseInt(firstProteinItem.dosage.replace(/[^0-9]/g, ''), 10);
            if (currentDosage > 20) {
                 const newDosage = Math.max(20, Math.round(currentDosage * 0.75 / 5) * 5);
                 if (newDosage < currentDosage) {
                    suggestions.push({
                        id: 'reduce-protein-volume-drop',
                        title: t('suggestion_reduce_protein_title'),
                        reason: t('suggestion_reduce_protein_reason'),
                        identifier: `UPDATE:${firstProteinItem.supplement}:dosage:reduce`,
                        action: {
                            type: 'UPDATE',
                            itemId: firstProteinItem.id,
                            updates: { dosage: `~${newDosage}g` }
                        }
                    });
                 }
            }
        }
    }

    // Suggestion 11: Remove Pre-workout / Stimulants (Removal on Break/Injury)
    if (isSignificantVolumeDrop && volumeDropRatio < 0.5 && volumeDropReason === 'injury') {
        const preWorkoutItems = plan.plan.filter(item => {
            const id = getExplanationIdForSupplement(item.supplement);
            return id === 'caffeine' || id === 'citrulline' || item.supplement.toLowerCase().includes('pre-workout');
        });

        preWorkoutItems.forEach(item => {
            suggestions.push({
                id: `remove-preworkout-${item.id}`,
                title: t('suggestion_remove_preworkout_title'),
                reason: t('suggestion_remove_preworkout_reason'),
                identifier: `REMOVE:${item.supplement}:break`,
                action: { type: 'REMOVE', itemId: item.id }
            });
        });
    }

    // Suggestion 12: Remove Beta-Alanine (Low Frequency)
    const betaAlanineItem = plan.plan.find(item => getExplanationIdForSupplement(item.supplement) === 'betaalanine');
    if (betaAlanineItem && avgWeeklySessions < 2) {
        suggestions.push({
            id: 'remove-beta-alanine-freq',
            title: t('suggestion_remove_beta_alanine_title'),
            reason: t('suggestion_remove_beta_alanine_reason'),
            identifier: `REMOVE:${betaAlanineItem.supplement}:frequency`,
            action: { type: 'REMOVE', itemId: betaAlanineItem.id }
        });
    }

    // Suggestion 13: Remove Morning Specific Supplements (Schedule Change)
    if (!isEarlyMorningUser) {
        const morningBcaa = plan.plan.find(item => {
            const isEaa = getExplanationIdForSupplement(item.supplement) === 'eaa';
            const isMorning = item.time === 'supplements_time_morning';
            return isEaa && isMorning;
        });

        if (morningBcaa) {
            suggestions.push({
                id: 'remove-morning-bcaa-schedule',
                title: t('suggestion_remove_morning_supp_title'),
                reason: t('suggestion_remove_morning_supp_reason'),
                identifier: `REMOVE:${morningBcaa.supplement}:schedule`,
                action: { type: 'REMOVE', itemId: morningBcaa.id }
            });
        }
    }
    
    // Suggestion 14: Move Protein Timing based on Schedule
    if (mostFrequentTrainingTime === 'morning') {
        const proteinBreakfast = plan.plan.find(item => {
            const isProtein = getExplanationIdForSupplement(item.supplement) === 'protein';
            const isBreakfast = item.time === 'supplements_time_with_breakfast';
            return isProtein && isBreakfast;
        });
        
        if (proteinBreakfast) {
            suggestions.push({
                id: 'move-protein-lunch',
                title: t('suggestion_move_protein_lunch_title'),
                reason: t('suggestion_move_protein_lunch_reason'),
                identifier: `UPDATE:${proteinBreakfast.supplement}:time:lunch`,
                action: {
                    type: 'UPDATE',
                    itemId: proteinBreakfast.id,
                    updates: { 
                        time: 'supplements_time_lunch',
                        notes: t('supplements_note_protein_lunch')
                    }
                }
            });
        }
    } else {
         const proteinLunch = plan.plan.find(item => {
            const isProtein = getExplanationIdForSupplement(item.supplement) === 'protein';
            const isLunch = item.time === 'supplements_time_lunch';
            return isProtein && isLunch;
        });
        
        if (proteinLunch) {
            suggestions.push({
                id: 'move-protein-breakfast',
                title: t('suggestion_move_protein_breakfast_title'),
                reason: t('suggestion_move_protein_breakfast_reason'),
                identifier: `UPDATE:${proteinLunch.supplement}:time:breakfast`,
                action: {
                    type: 'UPDATE',
                    itemId: proteinLunch.id,
                    updates: { 
                        time: 'supplements_time_with_breakfast',
                        notes: t('supplements_note_protein_breakfast')
                    }
                }
            });
        }
    }

    // Suggestion 15: Stimulant Tolerance Break
    if (takenSupplements) {
        const toleranceSuggestion = checkStimulantTolerance(takenSupplements, plan.plan, t);
        if (toleranceSuggestion) {
            suggestions.push(toleranceSuggestion);
        }
    }

    return suggestions;
};
