import { CALISTHENICS_PROGRAMS, PROGRAM_COL_TABLES, scaleDay, ProgramDef, ProgramDayDef } from '../constants/calisthenicsPrograms';

export const getProgramDef = (programId: string): ProgramDef | undefined =>
  CALISTHENICS_PROGRAMS.find((p) => p.id === programId);

export const scaleForTarget = (def: ProgramDef, userTarget: number): number => {
  if (!userTarget || userTarget <= 0) return 1;
  return userTarget / def.canonicalTarget;
};

/** Scaled day for a reps program (column-aware). Week/day are 1-indexed. */
export function getScaledDay(programId: string, column: 1 | 2 | 3, week: number, day: number, userTarget: number): ProgramDayDef {
  const def = getProgramDef(programId);
  const cols = PROGRAM_COL_TABLES[programId];
  if (!def || !cols) return { sets: [10, 10, 10], rest: 60, minLast: 10 };
  const colIdx = column - 1;
  const wIdx = Math.min(Math.max(week - 1, 0), cols[colIdx].length - 1);
  const dIdx = Math.min(Math.max(day - 1, 0), cols[colIdx][wIdx].length - 1);
  const base = cols[colIdx][wIdx][dIdx];
  return scaleDay(base, scaleForTarget(def, userTarget), def.unit);
}

/** Plank-style linear session (0-indexed session). */
export function getScaledSession(programId: string, sessionIndex: number, userTarget: number): ProgramDayDef {
  const def = getProgramDef(programId);
  if (!def || !def.sessions || def.sessions.length === 0) return { sets: [60], rest: 60, minLast: 60 };
  const idx = Math.min(Math.max(sessionIndex, 0), def.sessions.length - 1);
  return scaleDay(def.sessions[idx], scaleForTarget(def, userTarget), def.unit);
}

export function totalWeeks(programId: string): number {
  const cols = PROGRAM_COL_TABLES[programId];
  if (cols) return cols[0].length;
  const def = getProgramDef(programId);
  if (def?.sessions) return Math.ceil(def.sessions.length / 7);
  return 6;
}

export function totalSessions(programId: string): number {
  const def = getProgramDef(programId);
  if (def?.sessions) return def.sessions.length;
  const cols = PROGRAM_COL_TABLES[programId];
  if (!cols) return 18;
  return cols[0].reduce((acc, weekDays) => acc + weekDays.length, 0);
}

/** Advance pointer: reps -> day+1/week+1; plank -> sessionIndex+1. Returns null when program complete. */
export function nextPointer(programId: string, week: number, day: number, sessionIndex = 0): { week: number; day: number; sessionIndex: number } | null {
  const def = getProgramDef(programId);
  if (def?.sessions) {
    const next = sessionIndex + 1;
    if (next >= def.sessions.length) return null;
    return { week: Math.floor(next / 7) + 1, day: (next % 7) + 1, sessionIndex: next };
  }
  const cols = PROGRAM_COL_TABLES[programId];
  const weeks = cols ? cols[0].length : 6;
  let d = day + 1;
  let w = week;
  const daysInWeek = cols ? cols[0][Math.min(w - 1, weeks - 1)].length : 3;
  if (d > daysInWeek) {
    d = 1;
    w += 1;
  }
  if (w > weeks) return null;
  return { week: w, day: d, sessionIndex: 0 };
}

export function formatDayLabel(values: number[], unit: 'reps' | 'seconds'): string {
  if (unit === 'seconds') {
    return values.map((v) => (v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` : `${v}s`)).join(' + ');
  }
  return values.join('-');
}

export function isHiatus14(lastActiveAt: number, now = Date.now()): boolean {
  return now - lastActiveAt > 14 * 24 * 60 * 60 * 1000;
}

export function isHiatus28(lastActiveAt: number, now = Date.now()): boolean {
  return now - lastActiveAt > 28 * 24 * 60 * 60 * 1000;
}
