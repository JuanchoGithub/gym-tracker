
import { WorkoutSession, SupplementPlanItem, PerformedSet } from '../types';
import { getDateString } from '../utils/timeUtils';
import { PREDEFINED_EXERCISES } from '../constants/exercises';

// ... existing SupplementCorrelation code ...
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

export const calculateLifterDNA = (history: WorkoutSession[]): LifterStats => {
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
    let totalReps = 0;
    let totalSets = 0;
    let totalVolume = 0;
    const muscleCounts: Record<string, number> = {};

    history.slice(0, 20).forEach(s => { // Analyze last 20 sessions for archetype
        s.exercises.forEach(ex => {
            const def = PREDEFINED_EXERCISES.find(p => p.id === ex.exerciseId);
            if (def) {
                muscleCounts[def.bodyPart] = (muscleCounts[def.bodyPart] || 0) + 1;
            }

            ex.sets.forEach(set => {
                if (set.type === 'normal' && set.isComplete) {
                    totalReps += set.reps;
                    totalSets++;
                    totalVolume += set.weight * set.reps;
                }
            });
        });
    });

    const avgReps = totalSets > 0 ? totalReps / totalSets : 0;
    let archetype: LifterArchetype = 'hybrid';
    
    if (avgReps > 0 && avgReps <= 6) archetype = 'powerbuilder';
    else if (avgReps > 6 && avgReps <= 12) archetype = 'bodybuilder';
    else if (avgReps > 12) archetype = 'endurance';

    // 3. Volume Score (Average session volume. 10,000kg/session = 100)
    const avgSessionVolume = history.length > 0 ? totalVolume / history.length : 0;
    const volumeScore = Math.min(100, Math.round((avgSessionVolume / 10000) * 100));

    // 4. Intensity Score (Heuristic based on avg reps)
    // Lower reps = higher relative intensity (% of 1RM)
    // 5 reps => 90% 1RM, 10 reps => 75% 1RM, 15 reps => 60% 1RM
    // Scale: 1-5 reps = 100-90, 6-12 reps = 80-60, 15+ = <50
    let intensityScore = 50;
    if (avgReps > 0) {
        if (avgReps <= 5) intensityScore = 95;
        else if (avgReps <= 8) intensityScore = 85;
        else if (avgReps <= 12) intensityScore = 75;
        else if (avgReps <= 15) intensityScore = 60;
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
