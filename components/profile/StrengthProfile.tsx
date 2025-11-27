
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import RadarChart from '../common/RadarChart';
import { MOVEMENT_PATTERNS } from '../../utils/recommendationUtils';
import { getExerciseHistory, calculate1RM } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';

const StrengthProfile: React.FC = () => {
    const { history } = useContext(AppContext);
    const { t } = useI18n();

    // Ratios: OHP (2) : Bench (3) : Row (3) : Squat (4) : Deadlift (5)
    // We calculate scores by dividing 1RM by these factors.
    // Then we normalize all scores so the maximum score represents 100% on the chart.
    
    const chartData = useMemo(() => {
        // 1. Calculate max 1RM for each pattern
        const maxLifts: Record<string, number> = {
            SQUAT: 0,
            DEADLIFT: 0,
            BENCH: 0,
            OHP: 0,
            ROW: 0
        };
        
        // Look at last 6 months
        const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
        
        const getPatternMax = (ids: string[]) => {
            let maxVal = 0;
            ids.forEach(id => {
                const exHistory = getExerciseHistory(history, id);
                exHistory.forEach(entry => {
                     if (entry.session.startTime < sixMonthsAgo) return;
                     entry.exerciseData.sets.forEach(set => {
                         if (set.type === 'normal' && set.isComplete) {
                             const e1rm = calculate1RM(set.weight, set.reps);
                             if (e1rm > maxVal) maxVal = e1rm;
                         }
                     });
                });
            });
            return maxVal;
        };

        maxLifts.SQUAT = getPatternMax(MOVEMENT_PATTERNS.SQUAT);
        maxLifts.DEADLIFT = getPatternMax(MOVEMENT_PATTERNS.DEADLIFT);
        maxLifts.BENCH = getPatternMax(MOVEMENT_PATTERNS.BENCH);
        maxLifts.OHP = getPatternMax(MOVEMENT_PATTERNS.OHP);
        maxLifts.ROW = getPatternMax(MOVEMENT_PATTERNS.ROW);
        
        // 2. Normalize scores
        const scores = {
            SQUAT: maxLifts.SQUAT / 4,
            DEADLIFT: maxLifts.DEADLIFT / 5,
            BENCH: maxLifts.BENCH / 3,
            OHP: maxLifts.OHP / 2,
            ROW: maxLifts.ROW / 3
        };
        
        const maxScore = Math.max(...Object.values(scores));
        
        // Avoid division by zero if user has no data
        const scale = maxScore > 0 ? (100 / maxScore) : 0;
        
        // 3. Prepare Chart Data (Order matters for visual)
        // Standard: Top, Right, BottomRight, BottomLeft, Left
        // OHP (Top), Deadlift (Right), Squat (Bottom Right), Bench (Bottom Left), Row (Left) - Just an example arrangement
        // Let's try to group Upper vs Lower
        
        return [
            { label: t('body_part_shoulders'), value: scores.OHP * scale }, // Top
            { label: t('body_part_back'), value: scores.ROW * scale }, // Top Left
            { label: t('body_part_legs'), value: scores.SQUAT * scale }, // Bottom Left
            { label: "Posterior", value: scores.DEADLIFT * scale }, // Bottom Right
            { label: t('body_part_chest'), value: scores.BENCH * scale }, // Top Right
        ];
    }, [history, t]);
    
    // Check if there is enough data to display meaningful chart
    const hasData = chartData.some(d => d.value > 0);

    if (!hasData) return null;

    return (
        <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                <div className="p-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
                    <Icon name="scale" className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">{t('rec_type_imbalance')}</h3>
                    <p className="text-xs text-text-secondary">Based on strength symmetry ratios</p>
                </div>
            </div>
            
            <div className="aspect-square w-full max-w-[300px] mx-auto">
                <RadarChart data={chartData} />
            </div>
        </div>
    );
};

export default StrengthProfile;
