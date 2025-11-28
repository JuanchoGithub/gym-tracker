
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import RadarChart from '../common/RadarChart';
import { calculateNormalizedStrengthScores } from '../../services/analyticsService';
import { Icon } from '../common/Icon';

const StrengthProfile: React.FC = () => {
    const { history } = useContext(AppContext);
    const { t } = useI18n();

    const chartData = useMemo(() => {
        const scores = calculateNormalizedStrengthScores(history);
        
        // Check if there is enough data to display meaningful chart
        const hasData = Object.values(scores).some(val => val > 0);
        if (!hasData) return null;
        
        return [
            { label: t('body_part_shoulders'), value: scores.OHP }, // Top
            { label: t('body_part_back'), value: scores.ROW }, // Top Left
            { label: t('body_part_legs'), value: scores.SQUAT }, // Bottom Left
            { label: "Posterior", value: scores.DEADLIFT }, // Bottom Right
            { label: t('body_part_chest'), value: scores.BENCH }, // Top Right
        ];
    }, [history, t]);
    
    if (!chartData) return null;

    return (
        <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-lg mb-6">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                <div className="p-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
                    <Icon name="scale" className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">{t('rec_type_imbalance')}</h3>
                    <p className="text-xs text-text-secondary">{t('strength_symmetry_subtext')}</p>
                </div>
            </div>
            
            <div className="aspect-square w-full max-w-[300px] mx-auto">
                <RadarChart data={chartData} />
            </div>
        </div>
    );
};

export default StrengthProfile;
