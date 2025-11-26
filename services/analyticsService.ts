
import { WorkoutSession, SupplementPlanItem } from '../types';
import { getDateString } from '../utils/timeUtils';

export interface SupplementCorrelation {
    supplementId: string;
    supplementName: string;
    metric: 'volume' | 'prs';
    differencePercentage: number; // e.g., 15 for +15%, -5 for -5%
    sampleSizeOn: number;
    sampleSizeOff: number;
}

export const analyzeCorrelations = (
    history: WorkoutSession[],
    takenSupplements: Record<string, string[]>,
    allSupplements: SupplementPlanItem[]
): SupplementCorrelation[] => {
    const insights: SupplementCorrelation[] = [];

    // We need a minimum number of samples to be statistically somewhat relevant (or at least interesting)
    const MIN_SAMPLES = 3;

    // 1. Identify unique supplement IDs present in history or plan
    const relevantSupplements = new Set<string>();
    Object.values(takenSupplements).forEach(ids => ids.forEach(id => relevantSupplements.add(id)));

    // 2. Iterate through each supplement
    relevantSupplements.forEach(suppId => {
        const supplementInfo = allSupplements.find(s => s.id === suppId);
        // Fallback name if not found in current plan (e.g. deleted item)
        const supplementName = supplementInfo ? supplementInfo.supplement : 'Unknown Supplement';

        const onSessions: WorkoutSession[] = [];
        const offSessions: WorkoutSession[] = [];

        history.forEach(session => {
            const sessionDateStr = getDateString(new Date(session.startTime));
            const takenOnDay = takenSupplements[sessionDateStr]?.includes(suppId);

            // Basic correlation: Taken on the same day
            // Ideally we'd check time (pre-workout vs post), but date matching is a good start.
            if (takenOnDay) {
                onSessions.push(session);
            } else {
                offSessions.push(session);
            }
        });

        if (onSessions.length >= MIN_SAMPLES && offSessions.length >= MIN_SAMPLES) {
            // Calculate Metrics
            
            // A. Volume
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
                if (Math.abs(volDiff) >= 5) { // Only interesting if > 5% difference
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

            // B. PRs
            const getAvgPRs = (sessions: WorkoutSession[]) => {
                const totalPRs = sessions.reduce((acc, s) => acc + (s.prCount || 0), 0);
                return totalPRs / sessions.length;
            };

            const avgPrOn = getAvgPRs(onSessions);
            const avgPrOff = getAvgPRs(offSessions);

             if (avgPrOff > 0) {
                const prDiff = ((avgPrOn - avgPrOff) / avgPrOff) * 100;
                if (Math.abs(prDiff) >= 10) { // PRs vary more, higher threshold
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

    // Sort by absolute impact to show most significant first
    return insights.sort((a, b) => Math.abs(b.differencePercentage) - Math.abs(a.differencePercentage));
};
