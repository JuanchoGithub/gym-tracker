import { WeightUnit } from "../contexts/AppContext";

export const KG_TO_LBS = 2.20462;

export const convertKgToLbs = (kg: number): number => kg * KG_TO_LBS;
export const convertLbsToKg = (lbs: number): number => lbs / KG_TO_LBS;

/**
 * Formats a weight value (stored in kg) for display in the selected unit.
 * @param kg - The weight in kilograms.
 * @param unit - The target display unit ('kg' or 'lbs').
 * @param isDelta - If true, avoids formatting for zero to show relative changes correctly.
 * @returns A formatted string representation of the weight.
 */
export const formatWeightDisplay = (kg: number, unit: WeightUnit, isDelta: boolean = false): string => {
  if (kg === 0 && !isDelta) return "0";
  
  let value: number;
  if (unit === 'lbs') {
    value = convertKgToLbs(kg);
  } else {
    value = kg;
  }
  
  // Use one decimal place for lbs, or for kg if it's not a whole number.
  if (unit === 'lbs' || !Number.isInteger(value)) {
    return value.toFixed(1);
  }
  
  return value.toFixed(0);
};

/**
 * Converts a displayed weight value back to kilograms for storage.
 * @param displayValue - The weight value from the input field.
 * @param unit - The unit of the displayValue.
 * @returns The weight in kilograms.
 */
export const getStoredWeight = (displayValue: number, unit: WeightUnit): number => {
    if (isNaN(displayValue)) return 0;
    if (unit === 'lbs') {
        return convertLbsToKg(displayValue);
    }
    return displayValue;
};