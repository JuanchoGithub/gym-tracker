
import { useContext, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext';
import { formatWeightDisplay, getStoredWeight as getStoredWeightUtil, convertCmToFtIn } from '../utils/weightUtils';

export type WeightUnit = 'kg' | 'lbs';

export const useMeasureUnit = () => {
    const { measureUnit, setMeasureUnit } = useContext(AppContext);

    const weightUnit = measureUnit === 'imperial' ? 'lbs' : 'kg';

    const displayWeight = useCallback((kg: number, isDelta: boolean = false): string => {
        return formatWeightDisplay(kg, weightUnit, isDelta);
    }, [weightUnit]);

    const getStoredWeight = useCallback((displayValue: number): number => {
        return getStoredWeightUtil(displayValue, weightUnit);
    }, [weightUnit]);

    const displayHeight = useCallback((cm: number): string => {
        if (!cm || isNaN(cm)) return '';
        if (measureUnit === 'imperial') {
            const { feet, inches } = convertCmToFtIn(cm);
            return `${feet}' ${inches}"`;
        }
        return `${Math.round(cm)} cm`;
    }, [measureUnit]);
    
    return {
        measureUnit,
        setMeasureUnit,
        weightUnit,
        displayWeight,
        getStoredWeight,
        displayHeight,
    };
};