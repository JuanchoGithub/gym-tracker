import { useContext } from 'react';
import { AppContext, WeightUnit } from '../contexts/AppContext';
import { formatWeightDisplay, getStoredWeight as getStoredWeightUtil } from '../utils/weightUtils';

export const useWeight = () => {
    const { weightUnit, setWeightUnit } = useContext(AppContext);

    const displayWeight = (kg: number, isDelta: boolean = false): string => {
        return formatWeightDisplay(kg, weightUnit, isDelta);
    };

    const getStoredWeight = (displayValue: number): number => {
        return getStoredWeightUtil(displayValue, weightUnit);
    }
    
    return {
        unit: weightUnit,
        setUnit: setWeightUnit,
        displayWeight,
        getStoredWeight
    };
};
