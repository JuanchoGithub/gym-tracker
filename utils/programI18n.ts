import { TranslationKey } from '../contexts/I18nContext';
import { ProgramStatus } from '../types';

/** Display-name/desc/cue translation keys are derived from program id (e.g. 'squat-200'). */
export const progName = (programId: string): TranslationKey =>
  (`programs_${programId}_name` as TranslationKey);
export const progDesc = (programId: string): TranslationKey =>
  (`programs_${programId}_desc` as TranslationKey);
export const progCue = (programId: string): TranslationKey =>
  (`programs_${programId}_cue` as TranslationKey);

const STATUS_KEYS: Record<ProgramStatus, TranslationKey> = {
  active: 'programs_status_active',
  'needs-retest': 'programs_status_needs_retest',
  done: 'programs_status_done',
  cancelled: 'programs_status_cancelled',
  dropped: 'programs_status_dropped',
};
export const progStatus = (status: ProgramStatus): TranslationKey => STATUS_KEYS[status];

export const progUnit = (unit: 'reps' | 'seconds'): TranslationKey =>
  (unit === 'seconds' ? 'programs_unit_seconds' : 'programs_unit_reps');
