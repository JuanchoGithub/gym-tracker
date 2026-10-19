import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ProgramContext } from '../contexts/ProgramContext';
import { CALISTHENICS_PROGRAMS, PROGRAM_COL_TABLES, scaleDay } from '../constants/calisthenicsPrograms';
import { getProgramDef, getScaledDay, getScaledSession, formatDayLabel, nextPointer, totalWeeks, scaleForTarget } from '../utils/calisthenicsEngine';
import { progName, progDesc, progCue, progStatus, progUnit } from '../utils/programI18n';
import { PerformedSet, ProgramEnrollment, WorkoutExercise, WorkoutPlan, WorkoutSession } from '../types';
import { Icon } from '../components/common/Icon';
import { useI18n } from '../hooks/useI18n';
import { useWakeLock } from '../hooks/useWakeLock';

type View =
  | { mode: 'hub' }
  | { mode: 'test'; programId: string }
  | { mode: 'player'; enrollmentIds: string[] }
  | { mode: 'detail'; enrollmentId: string };

const ProgramsPage: React.FC = () => {
  const { enrollments, plan, setPlanProgramIds, updateEnrollment, cancelEnrollment, dropEnrollment, refreshHiatus } = useContext(ProgramContext);
  const { t } = useI18n();
  const [view, setView] = useState<View>({ mode: 'hub' });

  useEffect(() => { refreshHiatus(); }, [refreshHiatus]);

  // Deep-link from Train page cards ('__plan__' launches the back-to-back plan run)
  useEffect(() => {
    try {
      const id = window.localStorage.getItem('programContinueId');
      if (id) {
        window.localStorage.removeItem('programContinueId');
        if (id === '__plan__') {
          const ordered = plan.programIds
            .map((pid) => enrollments.find((e) => e.programId === pid && e.status === 'active'))
            .filter((e): e is ProgramEnrollment => Boolean(e));
          if (ordered.length > 0) setView({ mode: 'player', enrollmentIds: ordered.map((e) => e.id) });
          return;
        }
        const found = enrollments.find((e) => e.id === id);
        if (found) {
          if (found.status === 'needs-retest') setView({ mode: 'test', programId: found.programId });
          else if (found.status === 'active') setView({ mode: 'player', enrollmentIds: [id] });
          else setView({ mode: 'detail', enrollmentId: id });
        }
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === 'active' || e.status === 'needs-retest'),
    [enrollments]
  );
  const pastEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === 'done' || e.status === 'cancelled' || e.status === 'dropped'),
    [enrollments]
  );

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('programs_title')}</h1>
        {view.mode !== 'hub' && (
          <button onClick={() => setView({ mode: 'hub' })} className="text-sm text-primary font-semibold">{t('programs_back')}</button>
        )}
      </div>

      {view.mode === 'hub' && (
        <HubView
          activeEnrollments={activeEnrollments}
          pastEnrollments={pastEnrollments}
          plan={plan}
          onPlanChange={setPlanProgramIds}
          onRunPlan={(ids) => setView({ mode: 'player', enrollmentIds: ids })}
          onTest={(programId) => setView({ mode: 'test', programId })}
          onOpen={(enrollmentId) => setView({ mode: 'player', enrollmentIds: [enrollmentId] })}
          onDetail={(enrollmentId) => setView({ mode: 'detail', enrollmentId })}
          onCancel={cancelEnrollment}
          onDrop={dropEnrollment}
          onToggleRecent={(e) => updateEnrollment(e.id, { showInRecent: !e.showInRecent })}
        />
      )}

      {view.mode === 'test' && (
        <TestView
          programId={view.programId}
          existingId={activeEnrollments.find((e) => e.programId === view.programId && e.status === 'needs-retest')?.id}
          onDone={(enrollmentId) => setView({ mode: 'player', enrollmentIds: [enrollmentId] })}
          onBack={() => setView({ mode: 'hub' })}
        />
      )}

      {view.mode === 'player' && (
        <PlayerView
          enrollmentIds={view.enrollmentIds}
          onDone={() => setView({ mode: 'hub' })}
          onDetail={(enrollmentId) => setView({ mode: 'detail', enrollmentId })}
        />
      )}

      {view.mode === 'detail' && (
        <DetailView enrollmentId={view.enrollmentId} onBack={() => setView({ mode: 'hub' })} />
      )}
    </div>
  );
};

// ---------- Hub ----------
const HubView: React.FC<{
  activeEnrollments: ProgramEnrollment[];
  pastEnrollments: ProgramEnrollment[];
  plan: WorkoutPlan;
  onPlanChange: (ids: string[]) => void;
  onRunPlan: (enrollmentIds: string[]) => void;
  onTest: (programId: string) => void;
  onOpen: (enrollmentId: string) => void;
  onDetail: (enrollmentId: string) => void;
  onCancel: (id: string) => void;
  onDrop: (id: string) => void;
  onToggleRecent: (e: ProgramEnrollment) => void;
}> = ({ activeEnrollments, pastEnrollments, plan, onPlanChange, onRunPlan, onTest, onOpen, onDetail, onCancel, onDrop, onToggleRecent }) => {
  const { t } = useI18n();
  const planEntries = plan.programIds
    .map((pid) => activeEnrollments.find((e) => e.programId === pid))
    .filter((e): e is ProgramEnrollment => Boolean(e));
  const addable = CALISTHENICS_PROGRAMS.filter(
    (p) => !plan.programIds.includes(p.id) && activeEnrollments.some((e) => e.programId === p.id)
  );
  const movePlan = (idx: number, dir: -1 | 1) => {
    const next = plan.programIds.slice();
    const to = idx + dir;
    if (to < 0 || to >= next.length) return;
    [next[idx], next[to]] = [next[to], next[idx]];
    onPlanChange(next);
  };
  return (
    <div className="space-y-4">
      <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('programs_plan_title')}</h2>
          <span className="text-xs text-text-secondary">{t('programs_plan_sub')}</span>
        </div>
        {plan.programIds.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('programs_plan_empty')}</p>
        ) : planEntries.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('programs_plan_none_active')}</p>
        ) : (
          <div className="space-y-2">
            {planEntries.map((e, i) => {
              const planIdx = plan.programIds.indexOf(e.programId);
              return (
                <div key={e.programId} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span className="font-bold text-sm flex-1 truncate min-w-0">
                    {i + 1}. {t(progName(e.programId))}
                    {e.status === 'needs-retest' && <span className="text-yellow-400 font-medium"> · {t('programs_paused')}</span>}
                  </span>
                  <button onClick={() => movePlan(planIdx, -1)} disabled={planIdx === 0} className="px-2 text-text-secondary disabled:opacity-30" aria-label={t('programs_move_up')}>↑</button>
                  <button onClick={() => movePlan(planIdx, 1)} disabled={planIdx === plan.programIds.length - 1} className="px-2 text-text-secondary disabled:opacity-30" aria-label={t('programs_move_down')}>↓</button>
                  <button onClick={() => onPlanChange(plan.programIds.filter((x) => x !== e.programId))} className="px-2 text-red-400" aria-label={t('programs_remove_plan')}>✕</button>
                </div>
              );
            })}
          </div>
        )}
        {addable.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {addable.map((p) => (
              <button key={p.id} onClick={() => onPlanChange([...plan.programIds, p.id])} className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10">
                {t('programs_plan_add', { name: t(progName(p.id)) })}
              </button>
            ))}
          </div>
        )}
        {planEntries.length > 1 && (
          <button
            onClick={() => onRunPlan(planEntries.map((e) => e.id))}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl"
          >
            {t('programs_plan_start_many', { count: planEntries.length })}
          </button>
        )}
      </div>
      {activeEnrollments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('programs_section_active')}</h2>
          {activeEnrollments.map((e) => (
            <ActiveRow key={e.id} enrollment={e} onOpen={onOpen} onDetail={onDetail} onCancel={onCancel} onDrop={onDrop} onToggleRecent={onToggleRecent} />
          ))}
        </div>
      )}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t('programs_section_start')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CALISTHENICS_PROGRAMS.map((p) => {
            const existing = activeEnrollments.find((a) => a.programId === p.id);
            return (
            <div key={p.id} className="bg-surface border border-white/10 rounded-2xl p-4">
              <div className="font-bold text-lg">{t(progName(p.id))}</div>
              <div className="text-sm text-text-secondary">{t(progDesc(p.id))}</div>
              <div className="text-xs text-text-secondary mt-1">{t('programs_card_meta', { target: p.canonicalTarget, unit: t(progUnit(p.unit)), days: p.defaultDays })}</div>
              <button
                onClick={() => {
                  if (!existing) onTest(p.id);
                  else if (existing.status === 'needs-retest') onTest(p.id);
                  else onOpen(existing.id);
                }}
                className={`mt-3 font-bold px-4 py-2 rounded-lg text-sm w-full ${existing ? 'bg-emerald-600 text-white' : 'bg-primary text-white'}`}
              >
                {existing ? (existing.status === 'needs-retest' ? t('programs_retest_to_continue') : t('programs_continue')) : t('programs_take_test')}
              </button>
            </div>
            );
          })}
        </div>
      </div>
      {pastEnrollments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('programs_section_past')}</h2>
          {pastEnrollments.map((e) => (
            <div key={e.id} className="bg-surface/50 border border-white/5 rounded-2xl p-3 text-sm flex justify-between">
              <span>{t('programs_past_row', { id: t(progName(e.programId)), status: t(progStatus(e.status)), target: e.userTarget })}</span>
              <button onClick={() => onDetail(e.id)} className="text-primary font-semibold">{t('programs_past_view')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActiveRow: React.FC<{
  enrollment: ProgramEnrollment;
  onOpen: (id: string) => void;
  onDetail: (id: string) => void;
  onCancel: (id: string) => void;
  onDrop: (id: string) => void;
  onToggleRecent: (e: ProgramEnrollment) => void;
}> = ({ enrollment: e, onOpen, onDetail, onCancel, onDrop, onToggleRecent }) => {
  const { updateEnrollment, retestEnrollment } = useContext(ProgramContext);
  const { t } = useI18n();
  const [retestVal, setRetestVal] = useState('');
  const day = e.unit === 'seconds'
    ? getScaledSession(e.programId, e.currentSessionIndex ?? 0, e.userTarget)
    : getScaledDay(e.programId, e.column, e.currentWeek, e.currentDay, e.userTarget);
  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-bold">{t(progName(e.programId))} <span className="text-xs font-normal text-text-secondary">{t('programs_col_n', { column: e.column })}</span></div>
          <div className="text-sm">{e.unit === 'seconds' ? t('programs_session_n', { n: (e.currentSessionIndex ?? 0) + 1 }) : `W${e.currentWeek}D${e.currentDay}`} · {formatDayLabel(day.sets, e.unit)} · {t('programs_target')} {e.userTarget}</div>
          {e.lastCompleted && <div className="text-xs text-text-secondary">{t('programs_last', { summary: e.lastCompleted.summary })}</div>}
          {e.status === 'needs-retest' && <div className="text-xs text-yellow-400 font-semibold">{t('programs_paused_14')}</div>}
        </div>
        <button onClick={() => onDetail(e.id)} className="text-text-secondary"><Icon name="arrow-right" className="w-5 h-5" /></button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {e.status === 'active' ? (
          <button onClick={() => onOpen(e.id)} className="bg-primary text-white font-bold px-4 py-2 rounded-lg">{t('programs_continue')}</button>
        ) : (
          <div className="flex gap-2 items-center w-full">
            <input value={retestVal} onChange={(ev) => setRetestVal(ev.target.value)} inputMode="numeric" placeholder={e.unit === 'seconds' ? t('programs_retest_ph_seconds') : t('programs_retest_ph_reps')} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 w-36" />
            <button
              onClick={() => { const v = parseInt(retestVal, 10); if (!Number.isNaN(v) && v >= 0) { retestEnrollment(e.id, v); setRetestVal(''); } }}
              className="bg-primary text-white font-bold px-4 py-2 rounded-lg"
            >{t('programs_retest_continue')}</button>
            <button onClick={() => onDrop(e.id)} className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg">{t('programs_drop')}</button>
          </div>
        )}
        <button onClick={() => { if (window.confirm(t('programs_cancel_confirm'))) onCancel(e.id); }} className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg">{t('programs_cancel')}</button>
        <label className="flex items-center gap-2 text-xs text-text-secondary ml-auto">
          <input type="checkbox" checked={e.showInRecent} onChange={() => onToggleRecent(e)} /> {t('programs_show_recent')}
        </label>
      </div>
      <details className="text-xs text-text-secondary">
        <summary className="cursor-pointer">{t('programs_settings')}</summary>
        <div className="flex gap-2 mt-2 items-center">
          <label>{t('programs_target')} <input type="number" inputMode="numeric" pattern="[0-9]*" value={e.userTarget} min={1} onChange={(ev) => updateEnrollment(e.id, { userTarget: Math.max(1, parseInt(ev.target.value || '1', 10)) })} className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20" /></label>
          <label>{t('programs_days_wk')} <input type="number" inputMode="numeric" pattern="[0-9]*" value={e.daysPerWeek} min={2} max={7} onChange={(ev) => updateEnrollment(e.id, { daysPerWeek: Math.min(7, Math.max(2, parseInt(ev.target.value || '3', 10))) })} className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-16" /></label>
        </div>
      </details>
    </div>
  );
};

// ---------- Test ----------
const TestView: React.FC<{ programId: string; existingId?: string; onDone: (enrollmentId: string) => void; onBack: () => void }> = ({ programId, existingId, onDone, onBack }) => {
  const { enroll, retestEnrollment } = useContext(ProgramContext);
  const { t } = useI18n();
  const def = CALISTHENICS_PROGRAMS.find((p) => p.id === programId);
  const [test, setTest] = useState('');
  const [target, setTarget] = useState(def ? String(def.canonicalTarget) : '');
  const [days, setDays] = useState(def ? String(def.defaultDays) : '3');
  if (!def) return <div>{t('programs_unknown')}</div>;
  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3">
      <h2 className="text-lg font-bold">{t('programs_test_title', { name: t(progName(def.id)) })}</h2>
      <p className="text-sm text-text-secondary">{t('programs_test_desc', { cue: t(progCue(def.id)) })}</p>
      <label className="block text-sm">{def.unit === 'seconds' ? t('programs_test_max_seconds') : t('programs_test_max_reps')}
        <input value={test} onChange={(e) => setTest(e.target.value)} inputMode="numeric" className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2" placeholder={def.unit === 'seconds' ? t('programs_test_ph_seconds') : t('programs_test_ph_reps')} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">{t('programs_test_target', { unit: t(progUnit(def.unit)) })}
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2" />
        </label>
        <label className="block text-sm">{t('programs_test_days')}
          <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={onBack} className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm">{t('programs_back')}</button>
        <button
          onClick={() => {
            const val = parseInt(test, 10);
            if (Number.isNaN(val) || val < 0) return;
            if (existingId) { retestEnrollment(existingId, val); onDone(existingId); return; }
            const enr = enroll({ programId, initialTest: val, userTarget: parseInt(target, 10) || def.canonicalTarget, daysPerWeek: parseInt(days, 10) || def.defaultDays });
            onDone(enr.id);
          }}
          className="bg-primary text-white font-bold px-4 py-2 rounded-lg text-sm flex-1"
        >{existingId ? t('programs_test_retest') : t('programs_test_start')}</button>
      </div>
    </div>
  );
};

// ---------- Player (runs all or part of a plan back to back; single program = 1-item sequence) ----------
const PlayerView: React.FC<{ enrollmentIds: string[]; onDone: () => void; onDetail: (enrollmentId: string) => void }> = ({ enrollmentIds, onDone, onDetail }) => {
  const { saveCompletedWorkout } = useContext(AppContext);
  const { enrollments, updateEnrollment, completeDay } = useContext(ProgramContext);
  const { t } = useI18n();
  const [sequence] = useState<string[]>(() => enrollmentIds.slice());
  const [runIdx, setRunIdx] = useState(0);
  const [collected, setCollected] = useState<WorkoutExercise[]>([]);
  const [actuals, setActuals] = useState<number[]>([]);
  const [setDone, setSetDone] = useState<boolean[]>([]);
  const [restLeft, setRestLeft] = useState<number>(0);
  const [holdLeft, setHoldLeft] = useState<number>(0);
  const [holdRunning, setHoldRunning] = useState(false);
  const [startTime] = useState(Date.now());
  useWakeLock(true);

  const activeId = runIdx < sequence.length ? sequence[runIdx] : undefined;
  const enrollment = activeId ? enrollments.find((e) => e.id === activeId) : undefined;
  const def = enrollment ? CALISTHENICS_PROGRAMS.find((p) => p.id === enrollment?.programId) : undefined;

  const day = useMemo(() => {
    if (!enrollment || !def) return null;
    return def.sessions
      ? getScaledSession(enrollment.programId, enrollment.currentSessionIndex ?? 0, enrollment.userTarget)
      : getScaledDay(enrollment.programId, enrollment.column, enrollment.currentWeek, enrollment.currentDay, enrollment.userTarget);
  }, [enrollment, def]);

  useEffect(() => {
    if (day) {
      setActuals(day.sets.map((s) => s));
      setSetDone(day.sets.map(() => false));
    }
    setRestLeft(0);
    setHoldLeft(0);
    setHoldRunning(false);
  }, [day, enrollment?.id]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const tm = window.setTimeout(() => setRestLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(tm);
  }, [restLeft]);

  useEffect(() => {
    if (!holdRunning || holdLeft <= 0) return;
    const tm = window.setTimeout(() => setHoldLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(tm);
  }, [holdRunning, holdLeft]);

  const exit = () => {
    if (collected.length > 0 && !window.confirm(t('programs_exit_confirm'))) return;
    onDone();
  };

  if (runIdx >= sequence.length) {
    return (
      <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
        <p>{t('programs_plan_complete')}</p>
        <button onClick={onDone} className="bg-primary text-white font-bold px-4 py-2 rounded-lg">{t('programs_back_to_hub')}</button>
      </div>
    );
  }

  if (!enrollment || !def || !day) {
    return (
      <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
        <p>{t('programs_skip_notice')}</p>
        <div className="flex gap-2">
          <button onClick={() => setRunIdx((v) => v + 1)} className="bg-primary text-white font-bold px-4 py-2 rounded-lg">{t('programs_next_program')}</button>
          <button onClick={exit} className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">{t('programs_exit_no_save')}</button>
        </div>
      </div>
    );
  }

  if (enrollment.status !== 'active') {
    return (
      <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
        <p>
          {t('programs_status_is', { name: t(progName(def.id)), status: t(progStatus(enrollment.status)) })}
          {enrollment.status === 'needs-retest' && ` ${t('programs_retest_hint')}`}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setRunIdx((v) => v + 1)} className="bg-primary text-white font-bold px-4 py-2 rounded-lg">{t('programs_next_program')}</button>
          <button onClick={exit} className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">{t('programs_exit_no_save')}</button>
        </div>
      </div>
    );
  }

  const passed = actuals.length === day.sets.length && actuals.every((a, i) => {
    if (i < day.sets.length - 1) return a >= day.sets[i];
    return a >= day.minLast;
  });

  const finish = () => {
    const values = actuals.slice();
    const summary = enrollment.unit === 'seconds'
      ? `S${(enrollment.currentSessionIndex ?? 0) + 1} ${formatDayLabel(values, 'seconds')}`
      : `W${enrollment.currentWeek}D${enrollment.currentDay} ${values.join('-')}`;
    const sets: PerformedSet[] = values.map((v, i) => ({
      id: `pset-${Date.now()}-${i}`,
      reps: def.unit === 'seconds' ? 1 : v,
      weight: 0,
      time: def.unit === 'seconds' ? v : undefined,
      type: def.unit === 'seconds' ? 'timed' : 'normal',
      isComplete: true,
      completedAt: Date.now(),
    }));
    const exercise: WorkoutExercise = {
      id: `we-${Date.now()}-${runIdx}`,
      exerciseId: def.exerciseId,
      sets,
      restTime: { normal: day.rest, warmup: 60, drop: 30, timed: 10, effort: 180, failure: 300 },
      note: summary,
    };
    completeDay(enrollment.id, values, passed, summary);
    if (!passed) {
      updateEnrollment(enrollment.id, { failedStreak: (enrollment.failedStreak ?? 0) + 1, lastActiveAt: Date.now(), lastCompleted: { week: enrollment.currentWeek, day: enrollment.currentDay, sessionIndex: enrollment.currentSessionIndex ?? 0, date: Date.now(), summary: `${summary} (repeat)` } });
    } else {
      const next = nextPointer(enrollment.programId, enrollment.currentWeek, enrollment.currentDay, enrollment.currentSessionIndex ?? 0);
      if (!next) {
        updateEnrollment(enrollment.id, { status: 'done', failedStreak: 0, lastActiveAt: Date.now(), lastCompleted: { week: enrollment.currentWeek, day: enrollment.currentDay, sessionIndex: enrollment.currentSessionIndex ?? 0, date: Date.now(), summary } });
      } else {
        updateEnrollment(enrollment.id, { currentWeek: next.week, currentDay: next.day as 1 | 2 | 3, currentSessionIndex: next.sessionIndex, failedStreak: 0, lastActiveAt: Date.now(), lastCompleted: { week: enrollment.currentWeek, day: enrollment.currentDay, sessionIndex: enrollment.currentSessionIndex ?? 0, date: Date.now(), summary } });
      }
    }
    const allExercises = [...collected, exercise];
    if (runIdx < sequence.length - 1) {
      setCollected(allExercises);
      setRunIdx((v) => v + 1);
      return;
    }
    const programIdOf = (id: string) => enrollments.find((e) => e.id === id)?.programId ?? '';
    const programIds = sequence.map(programIdOf).filter(Boolean);
    const multi = sequence.length > 1;
    const names = programIds.map((pid) => getProgramDef(pid) ? t(progName(pid)) : pid);
    const session: WorkoutSession = {
      id: `prog-${Date.now()}`,
      routineId: multi ? `plan-${programIds.join('_')}` : `prog-${def.id}-w${enrollment.currentWeek}d${enrollment.currentDay}s${enrollment.currentSessionIndex ?? 0}`,
      routineName: multi ? names.join(' + ') : (def.sessions ? `${def.name} S${(enrollment.currentSessionIndex ?? 0) + 1}` : `${def.name} W${enrollment.currentWeek}D${enrollment.currentDay}`),
      startTime,
      endTime: Date.now(),
      exercises: allExercises,
      source: 'program',
      programId: multi ? undefined : def.id,
      programIds: programIds,
      updatedAt: Date.now(),
    };
    saveCompletedWorkout(session);
    onDone();
  };

  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">
          {t(progName(def.id))} — {def.sessions ? t('programs_session_n', { n: (enrollment.currentSessionIndex ?? 0) + 1 }) : `W${enrollment.currentWeek}D${enrollment.currentDay}`}
          {sequence.length > 1 && <span className="text-xs text-text-secondary font-medium ml-2">{runIdx + 1}/{sequence.length}</span>}
        </h2>
        {sequence.length === 1 && <button onClick={() => onDetail(enrollment.id)} className="text-xs text-primary font-semibold">{t('programs_plan_button')}</button>}
      </div>
      <p className="text-sm text-text-secondary">{t(progCue(def.id))} {t(def.unit === 'seconds' ? 'programs_rest_holds' : 'programs_rest_sets', { rest: day.rest, min: day.minLast })}</p>
      {(restLeft > 0) && <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-3 text-center font-mono text-sm">{t('programs_rest_button')} {restLeft}s</div>}
      <div className="space-y-2">
        {day.sets.map((prescribed, i) => {
          const done = !!setDone[i];
          return (
            <div key={i} className={`flex items-center gap-2 rounded-lg p-2.5 transition-colors ${done ? 'bg-success/10 border border-success/20' : 'bg-white/5'}`}>
              <span className="text-sm text-text-secondary w-14">{t('programs_set_n', { n: i + 1 })}</span>
              <span className="text-sm">{t('programs_goal')} {prescribed}{def.unit === 'seconds' ? 's' : ''}{i === day.sets.length - 1 ? `+ (min ${day.minLast})` : ''}</span>
              <input
                type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={actuals[i] ?? prescribed}
                onChange={(e) => setActuals((prev) => prev.map((v, j) => (j === i ? Math.max(0, parseInt(e.target.value || '0', 10)) : v)))}
                className={`ml-auto w-14 text-right text-lg font-medium bg-black/20 border border-white/10 rounded-xl px-1 py-2 outline-none focus:ring-2 focus:ring-primary ${done ? 'text-success border-transparent bg-transparent' : ''}`}
              />
              <button
                onClick={() => {
                  setSetDone((prev) => prev.map((v, j) => (j === i ? !v : v)));
                  if (!done) setRestLeft(day.rest);
                }}
                aria-label={t('programs_set_n', { n: i + 1 })}
                title={t('programs_rest_button')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${done ? 'bg-success text-white' : 'bg-surface-highlight/40 text-text-secondary hover:bg-success/20 hover:text-success border border-white/5'}`}
              >
                <Icon name="check" className="w-5 h-5" />
              </button>
              {def.unit === 'seconds' && (
                <button onClick={() => { setHoldLeft(actuals[i] ?? prescribed); setHoldRunning(true); }} className="text-sm bg-indigo-500/30 border border-indigo-500/40 px-3 py-2 rounded flex-shrink-0">{t('programs_time_it')}</button>
              )}
            </div>
          );
        })}
      </div>
      {holdLeft > 0 && (
        <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-3 text-center">
          <div className="font-mono text-2xl">{holdLeft}s</div>
          <button onClick={() => setHoldRunning((v) => !v)} className="text-sm mt-1 px-3 py-1.5 bg-white/10 rounded">{holdRunning ? t('programs_pause') : t('programs_resume')}</button>
        </div>
      )}
      <div className={`text-sm font-semibold ${passed ? 'text-green-400' : 'text-yellow-400'}`}>
        {t(passed ? 'programs_on_target' : 'programs_below_target')}
      </div>
      <button onClick={finish} className="w-full bg-primary text-white font-bold py-3 rounded-xl">{sequence.length > 1 ? t('programs_finish_exercise') : t('programs_finish_day')}</button>
      <button onClick={exit} className="w-full text-sm text-text-secondary">{t('programs_exit_no_save')}</button>
    </div>
  );
};

// ---------- Detail / grid ----------
const DetailView: React.FC<{ enrollmentId: string; onBack: () => void }> = ({ enrollmentId, onBack }) => {
  const { enrollments, completions } = useContext(ProgramContext);
  const { t } = useI18n();
  const e = enrollments.find((x) => x.id === enrollmentId);
  if (!e) return <div>{t('programs_not_found')} <button onClick={onBack}>{t('programs_back')}</button></div>;
  const cols = PROGRAM_COL_TABLES[e.programId];
  const def = getProgramDef(e.programId);
  const scale = def ? scaleForTarget(def, e.userTarget) : 1;
  const mine = completions.filter((c) => c.enrollmentId === e.id);
  const doneKey = new Set(mine.map((c) => `${c.week}-${c.day}-${c.sessionIndex ?? 0}`));
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm text-primary font-semibold">{t('programs_back')}</button>
      <div className="bg-surface border border-white/10 rounded-2xl p-4">
        <div className="font-bold">{t('programs_detail_meta', { id: t(progName(e.programId)), column: e.column, target: e.userTarget, unit: t(progUnit(e.unit)) })}</div>
        <div className="text-xs text-text-secondary">{t('programs_detail_stats', { weeks: totalWeeks(e.programId), logged: mine.length, status: t(progStatus(e.status)) })}</div>
      </div>
      {cols ? (
        <div className="space-y-2">
          {cols[e.column - 1].map((weekDays, wi) => (
            <div key={wi} className="bg-surface/50 border border-white/5 rounded-xl p-3">
              <div className="text-sm font-bold mb-2">{t('programs_week_n', { n: wi + 1 })}</div>
              <div className="grid grid-cols-3 gap-2">
                {weekDays.map((day, di) => {
                  const done = doneKey.has(`${wi + 1}-${di + 1}-0`);
                  const isNext = (e.status === 'active' || e.status === 'needs-retest') && e.currentWeek === wi + 1 && e.currentDay === di + 1;
                  const scaled = def ? scaleDay(day, scale, def.unit) : day;
                  return (
                    <div key={di} className={`rounded-lg p-2 text-xs border ${done ? 'bg-green-500/10 border-green-500/30' : isNext ? 'bg-primary/10 border-primary/40' : 'bg-white/5 border-white/5'}`}>
                      <div className="font-bold">D{di + 1} {done ? '✓' : ''}</div>
                      <div className="text-text-secondary">{scaled.sets.join('-')}{scaled.sets.length ? t('programs_detail_min', { min: scaled.minLast }) : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface/50 border border-white/5 rounded-xl p-3 text-sm">
          {mine.length === 0 ? t('programs_no_sessions') : mine.slice(0, 20).map((c) => (
            <div key={c.id} className="flex justify-between border-b border-white/5 py-1">
              <span>{t('programs_session_n', { n: (c.sessionIndex ?? 0) + 1 })}</span>
              <span className="text-text-secondary">{c.values.join(' + ')}s · {c.passed ? t('programs_pass') : t('programs_repeat')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramsPage;
