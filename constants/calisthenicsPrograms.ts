
export type EffortUnit = 'reps' | 'seconds';

export interface ProgramDayDef {
  sets: number[];
  rest: number;
  minLast: number;
  // for split holds (plank) sets.length 1-2; null day = rest handled by caller
}

export interface Placement {
  column: 1 | 2 | 3;
  startWeek: number;
  startSessionIndex?: number;
}

export interface ProgramDef {
  id: string;
  exerciseId: string;
  unit: EffortUnit;
  canonicalTarget: number;
  defaultDays: number;
  name: string;
  description: string;
  cue: string;
  restDefault: number;
  // weeks[weekIndex][dayIndex] -> day def
  weeks: ProgramDayDef[][];
  // plank-style linear sessions (alternative to weeks); if present, player uses sessionIndex
  sessions?: ProgramDayDef[];
  place: (test: number) => Placement;
}

const d = (sets: number[], rest: number, minLast?: number): ProgramDayDef => ({
  sets,
  rest,
  minLast: minLast ?? sets[sets.length - 1],
});

// ---- Pushup (hundredpushups.com W1/W5/W6 verbatim, W2-W4 interpolated) ----
const PUSHUP_W1: ProgramDayDef[][] = [
  [d([2, 3, 2, 2, 3], 60, 3), d([3, 4, 2, 3, 4], 60, 4), d([4, 5, 4, 4, 5], 60, 5)],
  [d([6, 6, 4, 4, 5], 60, 5), d([6, 8, 6, 6, 7], 60, 7), d([8, 10, 7, 7, 10], 60, 10)],
  [d([10, 12, 7, 7, 9], 60, 9), d([10, 12, 8, 8, 12], 60, 12), d([11, 15, 9, 9, 13], 60, 13)],
];
// weeks stored per-column below; we transpose at build time.
// Represent as weeks[week][col][day]; flatten to weeks[week] -> days per column? Instead store per column.
type ColWeeks = ProgramDayDef[][][]; // [col][week][day]

const pushupCols: ColWeeks = [
  // col1
  [
    [d([2, 3, 2, 2, 3], 60, 3), d([3, 4, 2, 3, 4], 60, 4), d([4, 5, 4, 4, 5], 60, 5)],
    [d([6, 7, 5, 5, 8], 60, 8), d([7, 9, 6, 6, 10], 60, 10), d([8, 10, 7, 7, 12], 60, 12)],
    [d([10, 12, 9, 9, 13], 60, 13), d([12, 14, 10, 10, 16], 60, 16), d([14, 16, 12, 12, 18], 90, 18)],
    [d([14, 16, 13, 13, 18], 60, 18), d([16, 18, 14, 14, 22], 45, 22), d([18, 20, 16, 16, 25], 45, 25)],
    [d([17, 19, 15, 15, 20], 60, 20), d([10, 10, 13, 13, 10, 10, 9, 25], 45, 25), d([13, 13, 15, 15, 12, 12, 10, 30], 45, 30)],
    [d([25, 30, 20, 15, 40], 60, 40), d([14, 14, 15, 15, 14, 14, 10, 10, 44], 45, 44), d([13, 13, 17, 17, 16, 16, 14, 14, 50], 45, 50)],
  ],
  // col2
  [
    [d([6, 6, 4, 4, 5], 60, 5), d([6, 8, 6, 6, 7], 60, 7), d([8, 10, 7, 7, 10], 60, 10)],
    [d([9, 10, 8, 8, 12], 60, 12), d([10, 12, 9, 9, 14], 60, 14), d([12, 13, 10, 10, 16], 60, 16)],
    [d([14, 16, 12, 12, 18], 60, 18), d([16, 17, 13, 13, 20], 60, 20), d([18, 20, 15, 15, 24], 90, 24)],
    [d([20, 24, 18, 18, 28], 60, 28), d([22, 26, 20, 20, 32], 45, 32), d([24, 28, 22, 22, 36], 45, 36)],
    [d([28, 35, 25, 22, 35], 60, 35), d([18, 18, 20, 20, 14, 14, 16, 40], 45, 40), d([18, 18, 20, 20, 17, 17, 20, 45], 45, 45)],
    [d([40, 50, 25, 25, 50], 60, 50), d([20, 20, 23, 23, 20, 20, 18, 18, 53], 45, 53), d([22, 22, 30, 30, 25, 25, 18, 18, 55], 45, 55)],
  ],
  // col3
  [
    [d([10, 12, 7, 7, 9], 60, 9), d([10, 12, 8, 8, 12], 60, 12), d([11, 15, 9, 9, 13], 60, 13)],
    [d([13, 15, 11, 11, 16], 60, 16), d([14, 16, 12, 12, 18], 60, 18), d([16, 18, 13, 13, 20], 60, 20)],
    [d([18, 22, 16, 16, 24], 60, 24), d([20, 24, 18, 18, 28], 60, 28), d([24, 28, 20, 20, 32], 90, 32)],
    [d([28, 32, 24, 24, 36], 60, 36), d([30, 34, 26, 26, 40], 45, 40), d([32, 36, 28, 28, 44], 45, 44)],
    [d([36, 40, 30, 24, 40], 60, 40), d([19, 19, 22, 22, 18, 18, 22, 45], 45, 45), d([20, 20, 24, 24, 20, 20, 22, 50], 45, 50)],
    [d([45, 55, 35, 30, 55], 60, 55), d([22, 22, 30, 30, 24, 24, 18, 18, 58], 45, 58), d([26, 26, 33, 33, 26, 26, 22, 22, 60], 45, 60)],
  ],
];

// Pushup weeks view not used directly; engine indexes pushupCols[column][week][day].
// For generic ProgramDef.weeks we store col3 as representative; engine special-cases pushup-like ids.
const repWeeksFromCol = (col: ProgramDayDef[][][]): ProgramDayDef[][] =>
  col[2].map((weekDays) => weekDays);

const scaleDay = (day: ProgramDayDef, scale: number, unit: EffortUnit): ProgramDayDef => {
  if (scale === 1) return day;
  const min = unit === 'seconds' ? 5 : 1;
  const sets = day.sets.map((s) => Math.max(min, Math.round(s * scale)));
  return { sets, rest: day.rest, minLast: Math.max(min, Math.round(day.minLast * scale)) };
};

const SITUP_W1_COLS: ColWeeks = [
  [
    [d([3, 4, 3, 3, 5], 60, 5), d([5, 6, 3, 5, 6], 60, 6), d([6, 7, 6, 6, 8], 60, 8)],
    [d([8, 10, 7, 7, 12], 60, 12), d([10, 12, 9, 9, 14], 60, 14), d([12, 14, 11, 11, 16], 60, 16)],
    [d([16, 20, 14, 14, 22], 60, 22), d([20, 24, 18, 18, 28], 60, 28), d([24, 28, 22, 22, 34], 90, 34)],
    [d([28, 34, 26, 26, 40], 60, 40), d([32, 38, 30, 30, 48], 45, 48), d([36, 42, 34, 34, 56], 45, 56)],
    [d([34, 38, 30, 30, 40], 60, 40), d([20, 20, 26, 26, 20, 20, 18, 50], 45, 50), d([26, 26, 30, 30, 24, 24, 20, 60], 45, 60)],
    [d([50, 60, 40, 30, 80], 60, 80), d([28, 28, 30, 30, 28, 28, 20, 20, 88], 45, 88), d([26, 26, 34, 34, 32, 32, 28, 28, 100], 45, 100)],
  ],
  [
    [d([9, 9, 6, 6, 8], 60, 8), d([9, 12, 9, 9, 10], 60, 10), d([12, 15, 11, 11, 15], 60, 15)],
    [d([14, 16, 12, 12, 20], 60, 20), d([16, 18, 14, 14, 24], 60, 24), d([18, 22, 16, 16, 28], 60, 28)],
    [d([24, 30, 22, 22, 38], 60, 38), d([28, 34, 26, 26, 44], 60, 44), d([32, 40, 30, 30, 52], 90, 52)],
    [d([40, 48, 36, 36, 60], 60, 60), d([44, 52, 40, 40, 68], 45, 68), d([48, 58, 44, 44, 76], 45, 76)],
    [d([56, 70, 50, 44, 70], 60, 70), d([36, 36, 40, 40, 28, 28, 32, 80], 45, 80), d([36, 36, 40, 40, 34, 34, 40, 90], 45, 90)],
    [d([80, 100, 50, 50, 100], 60, 100), d([40, 40, 46, 46, 40, 40, 36, 36, 106], 45, 106), d([44, 44, 60, 60, 50, 50, 36, 36, 110], 45, 110)],
  ],
  [
    [d([15, 18, 10, 10, 14], 60, 14), d([15, 18, 15, 15, 18], 60, 18), d([17, 22, 14, 14, 20], 60, 20)],
    [d([20, 24, 18, 18, 30], 60, 30), d([24, 28, 22, 22, 36], 60, 36), d([28, 32, 24, 24, 42], 60, 42)],
    [d([34, 42, 32, 32, 56], 60, 56), d([40, 48, 38, 38, 64], 60, 64), d([46, 56, 42, 42, 74], 90, 74)],
    [d([56, 68, 52, 52, 84], 60, 84), d([62, 74, 58, 58, 94], 45, 94), d([68, 82, 64, 64, 104], 45, 104)],
    [d([72, 80, 60, 48, 80], 60, 80), d([38, 38, 44, 44, 36, 36, 44, 90], 45, 90), d([40, 40, 48, 48, 40, 40, 44, 100], 45, 100)],
    [d([90, 110, 70, 60, 110], 60, 110), d([44, 44, 60, 60, 48, 48, 36, 36, 116], 45, 116), d([52, 52, 66, 66, 52, 52, 44, 44, 120], 45, 120)],
  ],
];

// Squat reuses situp shape (conservative lower-body endurance)
const SQUAT_COLS: ColWeeks = SITUP_W1_COLS;

const DIP_COLS: ColWeeks = pushupCols.map((col) =>
  col.map((week) =>
    week.map((day) => ({
      sets: day.sets.map((s) => Math.round(s * 1.5)),
      rest: 120,
      minLast: Math.round(day.minLast * 1.5),
    }))
  )
) as ColWeeks;

const PULLUP_COLS: ColWeeks = [
  [
    [d([1, 1, 1, 1, 1], 120, 1), d([1, 1, 1, 1, 2], 120, 2), d([1, 1, 1, 1, 2], 120, 2)],
    [d([2, 1, 1, 1, 3], 120, 3), d([2, 2, 1, 2, 3], 120, 3), d([2, 2, 2, 2, 4], 120, 4)],
    [d([2, 2, 2, 2, 4], 120, 4), d([3, 2, 2, 3, 5], 120, 5), d([3, 3, 2, 3, 5], 120, 5)],
    [d([4, 3, 3, 2, 6], 120, 6), d([5, 4, 3, 3, 7], 120, 7), d([5, 5, 4, 4, 8], 120, 8)],
    [d([6, 5, 4, 4, 9], 120, 9), d([7, 6, 5, 5, 10], 120, 10), d([8, 7, 6, 5, 12], 120, 12)],
    [d([8, 10, 7, 7, 14], 120, 14), d([9, 11, 8, 8, 16], 120, 16), d([10, 12, 9, 9, 18], 120, 18)],
  ],
  [
    [d([2, 1, 1, 2, 3], 120, 3), d([2, 2, 1, 2, 3], 90, 3), d([2, 2, 2, 2, 4], 120, 4)],
    [d([3, 3, 3, 2, 5], 120, 5), d([3, 3, 3, 3, 6], 120, 6), d([4, 4, 3, 3, 7], 120, 7)],
    [d([4, 4, 4, 4, 8], 120, 8), d([5, 5, 4, 4, 9], 120, 9), d([6, 6, 5, 5, 10], 120, 10)],
    [d([8, 6, 5, 4, 10], 120, 10), d([9, 7, 6, 5, 12], 120, 12), d([10, 8, 7, 6, 14], 120, 14)],
    [d([10, 12, 8, 8, 15], 120, 15), d([12, 13, 9, 9, 16], 120, 16), d([13, 14, 10, 10, 18], 120, 18)],
    [d([12, 16, 12, 12, 19], 120, 19), d([13, 17, 13, 13, 20], 120, 20), d([14, 18, 14, 14, 21], 120, 21)],
  ],
  [
    [d([2, 1, 1, 2, 3], 120, 3), d([2, 2, 1, 2, 3], 90, 3), d([2, 2, 2, 2, 5], 120, 5)],
    [d([4, 4, 4, 4, 6], 120, 6), d([5, 4, 4, 4, 7], 120, 7), d([5, 5, 5, 4, 8], 120, 8)],
    [d([6, 6, 6, 5, 10], 120, 10), d([7, 7, 6, 6, 12], 120, 12), d([8, 8, 7, 7, 14], 120, 14)],
    [d([12, 10, 8, 7, 14], 120, 14), d([13, 11, 9, 8, 16], 120, 16), d([14, 12, 10, 9, 18], 120, 18)],
    [d([14, 16, 12, 12, 19], 120, 19), d([15, 17, 13, 13, 20], 120, 20), d([16, 18, 14, 14, 22], 120, 22)],
    [d([16, 20, 16, 16, 24], 120, 24), d([17, 21, 16, 16, 25], 120, 25), d([17, 22, 16, 16, 25], 120, 25)],
  ],
];

// Plank intermediate 35 sessions (0 = rest day)
const PLANK_SESSIONS: (ProgramDayDef | null)[] = [
  d([20], 45), d([20], 45), d([30], 45), d([30], 45), d([40], 60), null, d([45], 60),
  d([45], 60), d([60], 60), d([40, 40], 45), d([70], 60), null, d([80], 60),
  d([50, 50], 60), d([105], 60), d([60, 60], 60), d([110], 60), null, d([70, 70], 60),
  d([120], 75), d([135], 75), d([80, 80], 60), d([150], 75), d([90, 90], 75), null,
  d([150], 75), d([105, 105], 75), d([180], 80), d([120, 120], 80), d([210], 80), null,
  d([240], 80), d([140, 140], 80), d([270], 80), d([300], 90),
];

export const CALISTHENICS_PROGRAMS: ProgramDef[] = [
  {
    id: 'pushup-100', exerciseId: 'ex-23', unit: 'reps', canonicalTarget: 100, defaultDays: 3,
    name: 'Push-Up 100', description: 'Hundred pushups progression: test-gated columns, last set max.',
    cue: 'Good form: chest to fist height, full lockout. Last set is max (at least the minimum).',
    restDefault: 60, weeks: repWeeksFromCol(pushupCols),
    place: (t) => {
      if (t <= 5) return { column: 1, startWeek: 1 };
      if (t <= 10) return { column: 2, startWeek: 1 };
      if (t <= 20) return { column: 3, startWeek: 1 };
      if (t <= 30) return { column: 3, startWeek: 3 };
      if (t <= 35) return { column: 1, startWeek: 5 };
      if (t <= 40) return { column: 2, startWeek: 5 };
      if (t <= 50) return { column: 3, startWeek: 5 };
      if (t <= 60) return { column: 3, startWeek: 6 };
      return { column: 3, startWeek: 6 };
    },
  },
  {
    id: 'situp-200', exerciseId: 'ex-situp', unit: 'reps', canonicalTarget: 200, defaultDays: 3,
    name: 'Sit-Up 200', description: 'Two-hundred situps progression with columns and re-tests.',
    cue: 'Feet anchored, hands across chest, shoulder blades touch floor then torso vertical. Breathe naturally.',
    restDefault: 60, weeks: repWeeksFromCol(SITUP_W1_COLS),
    place: (t) => {
      if (t <= 10) return { column: 1, startWeek: 1 };
      if (t <= 20) return { column: 2, startWeek: 1 };
      if (t <= 30) return { column: 3, startWeek: 1 };
      if (t <= 50) return { column: 3, startWeek: 3 };
      if (t <= 80) return { column: 3, startWeek: 4 };
      if (t <= 110) return { column: 3, startWeek: 5 };
      return { column: 3, startWeek: 6 };
    },
  },
  {
    id: 'squat-200', exerciseId: 'ex-160', unit: 'reps', canonicalTarget: 200, defaultDays: 3,
    name: 'Squat 200', description: 'Bodyweight squat endurance progression.',
    cue: 'Feet shoulder width, hips below knees, chest up. Last set is max.',
    restDefault: 60, weeks: repWeeksFromCol(SQUAT_COLS),
    place: (t) => {
      if (t <= 15) return { column: 1, startWeek: 1 };
      if (t <= 30) return { column: 2, startWeek: 1 };
      if (t <= 50) return { column: 3, startWeek: 1 };
      if (t <= 80) return { column: 3, startWeek: 3 };
      if (t <= 110) return { column: 3, startWeek: 5 };
      return { column: 3, startWeek: 6 };
    },
  },
  {
    id: 'pullup-25', exerciseId: 'ex-6', unit: 'reps', canonicalTarget: 25, defaultDays: 3,
    name: 'Pull-Up 25', description: 'Strict pull-up progression with negatives for beginners.',
    cue: 'Dead hang to chin over bar, no kipping. Use negatives/jumps if you cannot do a full rep yet.',
    restDefault: 120, weeks: repWeeksFromCol(PULLUP_COLS),
    place: (t) => {
      if (t <= 2) return { column: 1, startWeek: 1 };
      if (t <= 5) return { column: 1, startWeek: 2 };
      if (t <= 9) return { column: 2, startWeek: 2 };
      if (t <= 14) return { column: 2, startWeek: 4 };
      return { column: 3, startWeek: 4 };
    },
  },
  {
    id: 'dip-150', exerciseId: 'ex-24', unit: 'reps', canonicalTarget: 150, defaultDays: 3,
    name: 'Dip 150', description: 'Parallel-bar dip progression (pushup tables scaled 1.5x).',
    cue: 'Shoulders below elbows at bottom, full lockout at top. Last set is max.',
    restDefault: 120, weeks: repWeeksFromCol(DIP_COLS),
    place: (t) => {
      if (t <= 8) return { column: 1, startWeek: 1 };
      if (t <= 15) return { column: 2, startWeek: 1 };
      if (t <= 30) return { column: 3, startWeek: 1 };
      if (t <= 45) return { column: 3, startWeek: 3 };
      if (t <= 60) return { column: 3, startWeek: 5 };
      return { column: 3, startWeek: 6 };
    },
  },
  {
    id: 'plank-300', exerciseId: 'ex-15', unit: 'seconds', canonicalTarget: 300, defaultDays: 5,
    name: 'Plank 5:00', description: 'Five-minute plank: daily single/split holds from :20.',
    cue: 'Elbows under shoulders, straight head-to-toe line, breathe naturally. Split sets rest 60-80s.',
    restDefault: 60,
    weeks: [[d([20], 45), d([20], 45), d([30], 45)], [d([60], 60), d([70], 60), d([80], 60)], [d([120], 75), d([150], 75), d([180], 80)], [d([240], 80), d([270], 80), d([300], 90)]],
    sessions: PLANK_SESSIONS.filter((s): s is ProgramDayDef => s !== null),
    place: (t) => {
      if (t < 20) return { column: 2, startWeek: 1, startSessionIndex: 0 };
      if (t < 40) return { column: 2, startWeek: 1, startSessionIndex: 6 };
      if (t < 70) return { column: 2, startWeek: 1, startSessionIndex: 12 };
      if (t < 110) return { column: 3, startWeek: 1, startSessionIndex: 18 };
      return { column: 3, startWeek: 1, startSessionIndex: 24 };
    },
  },
];

export const PROGRAM_COL_TABLES: Record<string, ColWeeks> = {
  'pushup-100': pushupCols,
  'situp-200': SITUP_W1_COLS,
  'squat-200': SQUAT_COLS,
  'pullup-25': PULLUP_COLS,
  'dip-150': DIP_COLS,
};

export { scaleDay };
export { PUSHUP_W1 };
