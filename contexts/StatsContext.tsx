
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UserStatistics } from '../types';
import { AppContext } from './AppContext';
import { calculateMuscleFreshness } from '../utils/fatigueUtils';
import { getWorkoutRecommendation, detectImbalances } from '../utils/recommendationUtils';
import { useI18n } from '../hooks/useI18n';

export interface StatsContextType {
    stats: UserStatistics;
    refreshStats: () => void;
    isCalculating: boolean;
}

const INITIAL_STATS: UserStatistics = {
    recommendation: null,
    freshness: {},
    imbalanceRecommendation: null,
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
            const freshness = calculateMuscleFreshness(history, exercises);
            const recommendation = getWorkoutRecommendation(history, routines, exercises, t, currentWeight);
            const imbalanceRecommendation = detectImbalances(history, routines, currentWeight, profile.gender);
            
            setStats({
                freshness,
                recommendation,
                imbalanceRecommendation,
                lastCalculated: Date.now()
            });
            setIsCalculating(false);
        }, 10);
    }, [history, routines, exercises, t, currentWeight, profile.gender, setStats]);

    // Initial calculation if empty or stale (older than 1 hour? or just ensuring it exists)
    useEffect(() => {
        if (stats.lastCalculated === 0 && history.length > 0) {
            refreshStats();
        }
    }, []); // Run once on mount if needed

    // Recalculate when history changes (workout finished)
    useEffect(() => {
        if (history.length > 0) {
             refreshStats();
        }
    }, [history]);

    const value = {
        stats,
        refreshStats,
        isCalculating
    };

    return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>;
};
