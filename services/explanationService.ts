

import { SupplementPlan } from '../types';

export interface Explanation {
    id: string;
    title: string;
    sections: {
        subtitle: string;
        content: string;
    }[];
}

export const getExplanationIdForSupplement = (supplementName: string): string | null => {
    const lowerName = supplementName.toLowerCase();
    if (lowerName.includes('protein') || lowerName.includes('proteína')) return 'protein';
    if (lowerName.includes('creatine') || lowerName.includes('creatina')) return 'creatine';
    if (lowerName.includes('omega')) return 'omega3';
    if (lowerName.includes('vitamin d')) return 'vitamind';
    if (lowerName.includes('magnesium') || lowerName.includes('magnesio')) return 'magnesium';
    if (lowerName.includes('beta-alanine') || lowerName.includes('beta alanina')) return 'betaalanine';
    if (lowerName.includes('caffeine') || lowerName.includes('cafeína')) return 'caffeine';
    if (lowerName.includes('eaa') || lowerName.includes('bcaa')) return 'eaa';
    if (lowerName.includes('zma')) return 'zma';
    return null; // For custom supplements
};


const getScoopFraction = (grams: number, t: (key: string) => string): string => {
    const typicalScoop = 35; // A reasonable average
    const fraction = grams / typicalScoop;
    if (fraction < 0.4) return t('scoop_fraction_less_half');
    if (fraction < 0.6) return t('scoop_fraction_half');
    if (fraction < 0.9) return t('scoop_fraction_three_quarters');
    if (fraction < 1.2) return t('scoop_fraction_one');
    return t('scoop_fraction_more_one');
};

export const generateSupplementExplanations = (plan: SupplementPlan, t: (key: string, replacements?: Record<string, string | number>) => string): Explanation[] => {
    const explanations: Explanation[] = [];
    const { info } = plan;

    // General Explanation
    explanations.push({
        id: 'general',
        title: t('explanation_general_title'),
        sections: [{ subtitle: '', content: t('explanation_general_content') }]
    });

    // Protein
    const proteinItems = plan.plan.filter(item => getExplanationIdForSupplement(item.supplement) === 'protein');
    if (proteinItems.length > 0) {
        const sections: Explanation['sections'] = [];
        // Why recommended
        const prot_total_needed_factor = 1.6 + (info.objective === 'gain' ? 0.4 : info.objective === 'lose' ? 0.6 : 0) + (info.trainingDays.length >= 4 ? 0.2 : 0) - (info.gender === 'female' ? 0.2 : 0);
        const prot_total_needed = Math.max(1.6, Math.min(2.2, prot_total_needed_factor)) * info.weight;
        const whey_needed = prot_total_needed - (info.proteinConsumption === 'unknown' ? info.weight * 1.2 : (info.proteinConsumption as number));
        
        sections.push({
            subtitle: t('explanation_protein_why'),
            content: t('explanation_protein_why_content', { goal: Math.round(prot_total_needed), needed: Math.round(whey_needed) })
        });

        // Type
        const isLactoseIntolerant = info.allergies.some(a => /lactose|dairy/i.test(a));
        const isVegan = info.allergies.some(a => /vegan/i.test(a));
        let typeContent = t('explanation_protein_type_whey');
        if (isLactoseIntolerant) typeContent = t('explanation_protein_type_isolate');
        if (isVegan) typeContent = t('explanation_protein_type_plant');
        sections.push({ subtitle: t('explanation_protein_type'), content: typeContent });

        // Dosing
        const doseSize = parseInt(proteinItems[0].dosage.replace(/[^0-9]/g, ''), 10);
        if (doseSize > 0) {
            sections.push({
                subtitle: t('explanation_protein_dosing', { doses: proteinItems.length }),
                content: t('explanation_protein_dosing_content', { doses: proteinItems.length, dose_size: doseSize, scoop_fraction: getScoopFraction(doseSize, t as (key: string) => string) })
            });
        }
        
        // Timing
        let timingContent = '';
        if (proteinItems.some(p => p.time.match(/post-workout|post-entreno|post-entrenamiento/i))) timingContent += t('explanation_protein_timing_post_workout') + '\n';
        if (proteinItems.some(p => p.time.match(/breakfast|desayuno|morning|mañana/i))) timingContent += t('explanation_protein_timing_morning') + '\n';
        if (proteinItems.some(p => p.time.match(/lunch|almuerzo/i))) timingContent += t('explanation_protein_timing_lunch') + '\n';
        if (proteinItems.some(p => p.time.match(/bed|dormir/i))) timingContent += t('explanation_protein_timing_evening') + '\n';
        if (timingContent) sections.push({ subtitle: t('explanation_protein_timing'), content: timingContent.trim() });
        
        explanations.push({ id: 'protein', title: t('explanation_protein_title'), sections });
    }

    // Creatine
    const creatineItem = plan.plan.find(item => getExplanationIdForSupplement(item.supplement) === 'creatine');
    if (creatineItem) {
        explanations.push({
            id: 'creatine',
            title: t('explanation_creatine_title'),
            sections: [
                { subtitle: t('explanation_creatine_why'), content: t('explanation_creatine_why_content', { dose: creatineItem.dosage }) },
                { subtitle: t('explanation_creatine_timing'), content: t('explanation_creatine_timing_content') }
            ]
        });
    }

    // Omega-3
    const omegaItem = plan.plan.find(item => getExplanationIdForSupplement(item.supplement) === 'omega3');
    if (omegaItem) {
        const isVegan = info.allergies.some(a => /vegan/i.test(a));
        explanations.push({
            id: 'omega3',
            title: t('explanation_omega3_title'),
            sections: [
                { subtitle: t('explanation_omega3_why'), content: t('explanation_omega3_why_content') },
                { subtitle: '', content: isVegan ? t('explanation_omega3_type_algae') : t('explanation_omega3_type_fish') }
            ]
        });
    }

    // Vitamin D
    if (plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'vitamind')) {
        explanations.push({ id: 'vitamind', title: t('explanation_vitamind_title'), sections: [{ subtitle: t('explanation_vitamind_why'), content: t('explanation_vitamind_why_content') }] });
    }

    // Magnesium
    if (plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'magnesium')) {
        explanations.push({ id: 'magnesium', title: t('explanation_magnesium_title'), sections: [{ subtitle: t('explanation_magnesium_why'), content: t('explanation_magnesium_why_content') }] });
    }

    // Beta-Alanine
    if (plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'betaalanine')) {
        explanations.push({ id: 'betaalanine', title: t('explanation_betaalanine_title'), sections: [{ subtitle: t('explanation_betaalanine_why'), content: t('explanation_betaalanine_why_content') }] });
    }

    // Caffeine
    if (plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'caffeine')) {
        explanations.push({ id: 'caffeine', title: t('explanation_caffeine_title'), sections: [{ subtitle: t('explanation_caffeine_why'), content: t('explanation_caffeine_why_content') }] });
    }

    // EAAs
    if (plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'eaa')) {
        explanations.push({ id: 'eaa', title: t('explanation_eaa_title'), sections: [{ subtitle: t('explanation_eaa_why'), content: t('explanation_eaa_why_content') }] });
    }

    // ZMA
    if (plan.plan.some(item => getExplanationIdForSupplement(item.supplement) === 'zma')) {
        explanations.push({ id: 'zma', title: t('explanation_zma_title'), sections: [{ subtitle: t('explanation_zma_why'), content: t('explanation_zma_why_content') }] });
    }

    return explanations;
};