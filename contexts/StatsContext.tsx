
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UserStatistics } from '../types';
import { AppContext } from './AppContext';
import { calculateMuscleFreshness } from '../utils/fatigueUtils';
import { getWorkoutRecommendation, detectImbalances, detectGoalMismatch, detectPromotions } from '../utils/recommendationUtils';
import { useI18n } from '../hooks/useI18n';

export interface StatsContextType {
    stats: UserStatistics;
    refreshStats: () => void;
    isCalculating: boolean;
}

const INITIAL_STATS: UserStatistics = {
    recommendation: null,
    activePromotion: null,
    freshness: {},
    imbalanceRecommendation: null,
    goalMismatchRecommendation: null,
    lastCalculated: 0
};

export const StatsContext = createContext<StatsContextType>({} as StatsContextType);

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { history, routines, exercises, currentWeight, profile } = useContext(AppContext);
    const { t } = useI18n();
    const [stats, setStats] = useLocalStorage<UserStatistics>('user_statistics', INITIAL_STATS);
    const [isCalculating, setIsCalculating] = useState(false);

    const refreshStats = useCallback(() => {
        setIsCalculating(true);
        // Defer calculation to next tick to allow UI to update
        setTimeout(() => {
            const freshness = calculateMuscleFreshness(history, exercises, profile.mainGoal);
            const recommendation = getWorkoutRecommendation(history, routines, exercises, t, currentWeight, profile);
            const imbalanceRecommendation = detectImbalances(history, routines, exercises, t, currentWeight, profile);
            const goalMismatchRecommendation = detectGoalMismatch(profile, history);
            const activePromotion = detectPromotions(history, exercises, routines, t, currentWeight, profile);
            
            setStats({
                freshness,
                recommendation,
                activePromotion,
                imbalanceRecommendation,
                goalMismatchRecommendation,
                lastCalculated: Date.now()
            });
            setIsCalculating(false);
        }, 10);
    }, [history, routines, exercises, t, currentWeight, profile, setStats]);

    // Recalculate when history, routines, exercises, profile goals/import status, or 1RMs change
    // Also include 't' or 'locale' dependency if not already implied, to refresh on lang switch
    useEffect(() => {
        refreshStats();
    }, [history, routines, exercises, profile.mainGoal, profile.smartGoalDetection, profile.oneRepMaxes, profile.lastImported, profile.promotionSnoozes, t]); 

    const value = {
        stats,
        refreshStats,
        isCalculating
    };

    return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
};
