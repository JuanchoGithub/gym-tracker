
import { WeightUnit } from "../contexts/AppContext";

export const KG_TO_LBS = 2.20462;

export const convertKgToLbs = (kg: number): number => {
    const lbs = kg * KG_TO_LBS;
    // Round to 2 decimals to avoid long floats but keep precision high enough
    return Math.round(lbs * 100) / 100;
};

export const convertLbsToKg = (lbs: number): number => {
    const kg = lbs / KG_TO_LBS;
    // Higher precision for storage to prevent round-trip drift
    return Math.round(kg * 10000) / 10000;
};

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
  
  // Use one decimal place for lbs if it has decimals, otherwise clean integer
  // For kg, same logic, but generally .5 increments are common.
  // Removing trailing zeros logic:
  if (Number.isInteger(value)) {
      return value.toFixed(0);
  }
  
  return value.toFixed(1);
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

export const CM_TO_INCHES = 0.393701;

export const convertCmToFtIn = (cm: number): { feet: number; inches: number } => {
  if (isNaN(cm) || cm <= 0) return { feet: 0, inches: 0 };
  const totalInches = cm * CM_TO_INCHES;
  const feet = Math.floor(totalInches / 12);
  const inchesValue = Math.round(totalInches % 12);
  if (inchesValue === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches: inchesValue };
};

export const convertFtInToCm = (feet: number, inches: number): number => {
  if (isNaN(feet) && isNaN(inches)) return 0;
  const totalInches = (feet || 0) * 12 + (inches || 0);
  return totalInches / CM_TO_INCHES;
};
