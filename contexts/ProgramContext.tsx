import React, { createContext, useCallback, useMemo } from 'react';
import { ProgramCompletion, ProgramEnrollment, ProgramStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getProgramDef, isHiatus14, isHiatus28 } from '../utils/calisthenicsEngine';

export interface EnrollInput {
  programId: string;
  initialTest: number;
  userTarget?: number;
  daysPerWeek?: number;
}

export interface ProgramContextType {
  enrollments: ProgramEnrollment[];
  completions: ProgramCompletion[];
  enroll: (input: EnrollInput) => ProgramEnrollment;
  updateEnrollment: (id: string, updates: Partial<ProgramEnrollment>) => void;
  cancelEnrollment: (id: string) => void;
  dropEnrollment: (id: string) => void;
  retestEnrollment: (id: string, newTest: number) => void;
  completeDay: (enrollmentId: string, values: number[], passed: boolean, summary: string) => void;
  refreshHiatus: () => void;
}

export const ProgramContext = createContext<ProgramContextType>({} as ProgramContextType);

export const ProgramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enrollmentsRaw, setEnrollmentsRaw] = useLocalStorage<ProgramEnrollment[]>('calisthenicsEnrollments', []);
  const [completionsRaw, setCompletionsRaw] = useLocalStorage<ProgramCompletion[]>('calisthenicsCompletions', []);

  const updateEnrollment = useCallback((id: string, updates: Partial<ProgramEnrollment>) => {
    setEnrollmentsRaw((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, [setEnrollmentsRaw]);

  const enroll = useCallback((input: EnrollInput) => {
    const def = getProgramDef(input.programId);
    if (!def) throw new Error(`Unknown program ${input.programId}`);
    const placement = def.place(input.initialTest);
    const enrollment: ProgramEnrollment = {
      id: `enr-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      programId: input.programId,
      userTarget: input.userTarget && input.userTarget > 0 ? Math.round(input.userTarget) : def.canonicalTarget,
      unit: def.unit,
      column: placement.column,
      startWeek: placement.startWeek,
      startSessionIndex: placement.startSessionIndex ?? 0,
      currentWeek: placement.startWeek,
      currentDay: 1,
      currentSessionIndex: placement.startSessionIndex ?? 0,
      daysPerWeek: input.daysPerWeek && input.daysPerWeek >= 2 && input.daysPerWeek <= 7 ? input.daysPerWeek : def.defaultDays,
      initialTest: input.initialTest,
      lastActiveAt: Date.now(),
      createdAt: Date.now(),
      status: 'active',
      showInRecent: false,
      failedStreak: 0,
    };
    setEnrollmentsRaw((prev) => [enrollment, ...prev]);
    return enrollment;
  }, [setEnrollmentsRaw]);

  const cancelEnrollment = useCallback((id: string) => {
    setEnrollmentsRaw((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'cancelled' as ProgramStatus, lastActiveAt: Date.now() } : e)));
  }, [setEnrollmentsRaw]);

  const dropEnrollment = useCallback((id: string) => {
    setEnrollmentsRaw((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'dropped' as ProgramStatus, lastActiveAt: Date.now() } : e)));
  }, [setEnrollmentsRaw]);

  const retestEnrollment = useCallback((id: string, newTest: number) => {
    const enrollment = enrollmentsRaw.find((e) => e.id === id);
    const def = enrollment ? getProgramDef(enrollment.programId) : undefined;
    if (!enrollment || !def) return;
    const placement = def.place(newTest);
    setEnrollmentsRaw((prev) => prev.map((e) => (e.id === id ? {
      ...e,
      column: placement.column,
      currentWeek: placement.startWeek,
      currentDay: 1,
      currentSessionIndex: placement.startSessionIndex ?? 0,
      initialTest: newTest,
      failedStreak: 0,
      status: 'active' as ProgramStatus,
      lastActiveAt: Date.now(),
    } : e)));
  }, [enrollmentsRaw, setEnrollmentsRaw]);

  const completeDay = useCallback((enrollmentId: string, values: number[], passed: boolean, summary: string) => {
    const enrollment = enrollmentsRaw.find((e) => e.id === enrollmentId);
    if (!enrollment) return;
    const completion: ProgramCompletion = {
      id: `cmp-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      enrollmentId,
      programId: enrollment.programId,
      week: enrollment.currentWeek,
      day: enrollment.currentDay,
      sessionIndex: enrollment.currentSessionIndex ?? 0,
      date: Date.now(),
      values,
      passed,
    };
    setCompletionsRaw((prev) => [completion, ...prev]);
    // Advance pointer is handled by caller via updateEnrollment to keep history + enrollment in sync.
    void summary;
  }, [enrollmentsRaw, setCompletionsRaw]);

  const refreshHiatus = useCallback(() => {
    const now = Date.now();
    setEnrollmentsRaw((prev) => prev.map((e) => {
      if (e.status !== 'active' && e.status !== 'needs-retest') return e;
      if (isHiatus28(e.lastActiveAt, now)) return { ...e, status: 'dropped' as ProgramStatus };
      if (isHiatus14(e.lastActiveAt, now) && e.status === 'active') return { ...e, status: 'needs-retest' as ProgramStatus };
      return e;
    }));
  }, [setEnrollmentsRaw]);

  const value = useMemo(() => ({
    enrollments: enrollmentsRaw,
    completions: completionsRaw,
    enroll,
    updateEnrollment,
    cancelEnrollment,
    dropEnrollment,
    retestEnrollment,
    completeDay,
    refreshHiatus,
  }), [enrollmentsRaw, completionsRaw, enroll, updateEnrollment, cancelEnrollment, dropEnrollment, retestEnrollment, completeDay, refreshHiatus]);

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
};
