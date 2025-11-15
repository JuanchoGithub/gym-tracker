import { SupplementInfo, SupplementPlan, SupplementPlanItem } from '../types';

// Sort helper
const timeOrder: { [key: string]: number } = {
    'Morning': 1,
    'Pre-workout': 2,
    'Post-workout': 3,
    'Daily with a meal': 4,
    'Evening': 5,
    'Daily': 6
};

const getTimeKey = (time: string): string => {
    if (time.includes('Morning')) return 'Morning';
    if (time.includes('Pre-workout')) return 'Pre-workout';
    if (time.includes('Post-workout')) return 'Post-workout';
    if (time.includes('Evening')) return 'Evening';
    if (time.includes('meal')) return 'Daily with a meal';
    return 'Daily';
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
            // Dose 1: Always post-workout on training days
            plan.push({
                id: `gen-protein-1-${Date.now()}`,
                time: t('supplements_time_post_workout'),
                supplement: proteinType,
                dosage: `~${dosagePerServing}g`,
                notes: t('supplements_note_protein_post_workout') + ' ' + t('supplements_note_protein_dose', { doseNum: 1, totalDoses: doses, goal: Math.round(prot_total_needed) }),
                trainingDayOnly: true,
            });

            // Dose 2: With breakfast
            if (doses >= 2) {
                plan.push({
                    id: `gen-protein-2-${Date.now()}`,
                    time: t('supplements_time_with_breakfast'),
                    supplement: proteinType,
                    dosage: `~${dosagePerServing}g`,
                    notes: t('supplements_note_protein_breakfast') + ' ' + t('supplements_note_protein_dose', { doseNum: 2, totalDoses: doses, goal: Math.round(prot_total_needed) }),
                });
            }

            // Dose 3: Before Bed
            if (doses >= 3) {
                 plan.push({
                    id: `gen-protein-3-${Date.now()}`,
                    time: t('supplements_time_before_bed'),
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

        plan.push({
            id: `gen-creatine-${Date.now()}`,
            time: t('supplements_time_daily_any'),
            supplement: t('supplements_name_creatine'),
            dosage: `${dosis_creatina}g`,
            notes: t('supplements_note_creatine')
        });
    }
    
    // 3. Omega-3
    if (age > 35 || objetivo === 2 || info.desiredSupplements.some(s => /omega/i.test(s))) {
        let dosis_omega = 1 + (age > 40 ? 0.5 : 0) + (objetivo === 2 ? 0.5 : 0);
        dosis_omega = Math.min(3, dosis_omega);
        plan.push({
            id: `gen-omega3-${Date.now()}`,
            time: t('supplements_time_with_meal'),
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
            time: t('supplements_time_morning_with_meal'),
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
            time: t('supplements_time_before_bed'),
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
            time: t('supplements_time_pre_workout'),
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
            time: t('supplements_time_pre_workout'),
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

    // Merge with custom supplements
    const finalPlan = [...plan, ...customSupplements];

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