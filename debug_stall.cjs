
const fs = require('fs');

// --- Helper Functions from utils/workoutUtils.ts ---

const calculate1RM = (weight, reps) => {
    if (reps === 0) return 0;
    return Math.round(weight * Math.pow(Math.min(reps, 20), 0.10));
};

const getExerciseHistory = (history, exerciseId) => {
    return history
        .map(session => {
            const matchingExercises = session.exercises.filter(ex => ex.exerciseId === exerciseId);
            if (matchingExercises.length === 0) return null;
            const allSets = matchingExercises.flatMap(ex => ex.sets).filter(s => s.isComplete);
            if (allSets.length === 0) return null;
            return { session, exerciseData: { sets: allSets } };
        })
        .filter(entry => entry !== null)
        .sort((a, b) => b.session.startTime - a.session.startTime);
};

// --- Helper Functions from services/analyticsService.ts ---

const floatGcd = (a, b) => {
    if (a < 0.01) return b;
    return floatGcd(b % a, a);
};

const detectPreferredIncrement = (historyEntries) => {
    const weightDeltas = [];
    let lastWeight = null;
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
    const inferredGcd = weightDeltas.reduce((acc, val) => floatGcd(acc, val), weightDeltas[0]);
    if (inferredGcd >= 4.5) return 5;
    if (inferredGcd >= 2.2) return 2.5;
    if (inferredGcd >= 1.0) return 1.25;
    return 2.5;
};

const analyzePerformance = (lastSession, targetRest) => {
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

// --- Main Logic: getSmartWeightSuggestion ---

const getSmartWeightSuggestion = (
    exerciseId,
    history,
    profile, // Mocked profile
    allExercises = [], // Mocked
    goal = 'muscle'
) => {
    const exHistory = getExerciseHistory(history, exerciseId);
    console.log(`[${exerciseId}] History Length: ${exHistory.length}`);

    if (exHistory.length > 0) {
        const lastEntry = exHistory[0];
        const lastSets = lastEntry.exerciseData.sets.filter(s => s.type === 'normal' && s.isComplete && s.weight > 0);

        if (lastSets.length > 0) {
            const lastWeight = lastSets[lastSets.length - 1].weight;
            const increment = detectPreferredIncrement(exHistory);

            console.log(`[${exerciseId}] Last Weight: ${lastWeight}, Increment: ${increment}`);

            const daysSince = (Date.now() - lastEntry.session.startTime) / (1000 * 60 * 60 * 24);
            // Ignored for loopback testing since dates in json might be old relative to Date.now() 
            // BUT we should verify if Date.now() affects it. 
            // The JSON has timestamps up to 1770... which is year 2026.
            // My current system time is 2026-02-06.

            // ... omitting early return for "rust" (lines 307-316) for simplicity unless relevant

            let activePhase = 'maintenance';
            let consecutiveStallCount = 1;

            // Mock skipping profile.recommendationLogs logic for now, assuming maintenance/none

            // Deload Sync check...

            // Main Stall Counting Loop
            for (let i = 1; i < exHistory.length; i++) {
                const prev = exHistory[i];
                const current = exHistory[i - 1];

                // Time checks
                // Using hardcoded Date.now() from environment or from the file's latest date?
                // The timestamps in the file (1770...) seem consistent with 2026.
                // 1770378895011 is approx Feb 2026.

                const isTooOld = (Date.now() - prev.session.startTime) > 30 * 24 * 60 * 60 * 1000;
                const weightGap = (current.session.startTime - prev.session.startTime) / (1000 * 60 * 60 * 24);

                if (isTooOld || weightGap > 21) {
                    console.log(`[${exerciseId}] Break loop at i=${i}. TooOld: ${isTooOld}, Gap: ${weightGap.toFixed(1)}`);
                    break;
                }

                const prevSets = prev.exerciseData.sets.filter(s => s.type === 'normal' && s.isComplete);
                if (prevSets.length === 0) continue;
                const prevMaxW = Math.max(...prevSets.map(s => s.weight));

                console.log(`[${exerciseId}] i=${i}: Last=${lastWeight}, Prev=${prevMaxW}`);

                if (Math.abs(prevMaxW - lastWeight) < 0.1) {
                    consecutiveStallCount++;
                } else {
                    console.log(`[${exerciseId}] Weight changed. Break.`);
                    break;
                }
            }

            console.log(`[${exerciseId}] Consecutive Stalls: ${consecutiveStallCount}`);

            let stallCycleCount = 0;
            let foundDeload = false;

            const weightInstances = exHistory.map(h => {
                const sets = h.exerciseData.sets.filter(s => s.type === 'normal');
                return sets.length > 0 ? Math.max(...sets.map(s => s.weight)) : 0;
            });

            for (let i = 1; i < weightInstances.length; i++) {
                if (weightInstances[i] < lastWeight * 0.95) foundDeload = true;
                if (foundDeload && weightInstances[i] >= lastWeight * 0.98) {
                    stallCycleCount++;
                    foundDeload = false;
                }
            }

            console.log(`[${exerciseId}] Stall Cycles: ${stallCycleCount}`);

            const stallThreshold = stallCycleCount >= 1 ? 2 : 3;
            console.log(`[${exerciseId}] Threshold: ${stallThreshold}`);

            if (consecutiveStallCount >= stallThreshold) {
                console.log(`[${exerciseId}] RESULT: STALLED`);
                const plateauWeight = Math.round((lastWeight * 0.9) / increment) * increment;
                return {
                    weight: plateauWeight,
                    phase: 'deload'
                };
            } else {
                console.log(`[${exerciseId}] RESULT: NOT STALLED (by consecutive count)`);
            }

            // ... (rest of logic) ...
            return { phase: 'maintenance', weight: lastWeight };
        }
    }
    return null;
};

// --- Execution ---

const data = JSON.parse(fs.readFileSync('/Users/jayjay/gitrepos/gym-tracker/data-log.json', 'utf8'));
const history = data.history;

console.log("--- Analyzing Bench Press (ex-1) ---");
getSmartWeightSuggestion('ex-1', history, {});

console.log("\n--- Analyzing Overhead Press (ex-4) ---");
getSmartWeightSuggestion('ex-4', history, {});
