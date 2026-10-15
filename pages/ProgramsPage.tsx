import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ProgramContext } from '../contexts/ProgramContext';
import { CALISTHENICS_PROGRAMS, PROGRAM_COL_TABLES, scaleDay } from '../constants/calisthenicsPrograms';
import { getProgramDef, getScaledDay, getScaledSession, formatDayLabel, nextPointer, totalWeeks, scaleForTarget } from '../utils/calisthenicsEngine';
import { PerformedSet, ProgramEnrollment, WorkoutSession } from '../types';
import { Icon } from '../components/common/Icon';

type View =
  | { mode: 'hub' }
  | { mode: 'test'; programId: string }
  | { mode: 'player'; enrollmentId: string }
  | { mode: 'detail'; enrollmentId: string };

const ProgramsPage: React.FC = () => {
  const { enrollments, updateEnrollment, cancelEnrollment, dropEnrollment, refreshHiatus } = useContext(ProgramContext);
  const [view, setView] = useState<View>({ mode: 'hub' });

  useEffect(() => { refreshHiatus(); }, [refreshHiatus]);

  // Deep-link from Continue card
  useEffect(() => {
    try {
      const id = window.localStorage.getItem('programContinueId');
      if (id) {
        window.localStorage.removeItem('programContinueId');
        const found = enrollments.find((e) => e.id === id);
        if (found) {
          if (found.status === 'needs-retest') setView({ mode: 'test', programId: found.programId });
          else if (found.status === 'active') setView({ mode: 'player', enrollmentId: id });
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
        <h1 className="text-2xl font-bold">Calisthenics Programs</h1>
        {view.mode !== 'hub' && (
          <button onClick={() => setView({ mode: 'hub' })} className="text-sm text-primary font-semibold">Back</button>
        )}
      </div>

      {view.mode === 'hub' && (
        <HubView
          activeEnrollments={activeEnrollments}
          pastEnrollments={pastEnrollments}
          onTest={(programId) => setView({ mode: 'test', programId })}
          onOpen={(enrollmentId) => setView({ mode: 'player', enrollmentId })}
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
          onDone={(enrollmentId) => setView({ mode: 'player', enrollmentId })}
          onBack={() => setView({ mode: 'hub' })}
        />
      )}

      {view.mode === 'player' && (
        <PlayerView
          enrollmentId={view.enrollmentId}
          onDone={() => setView({ mode: 'hub' })}
          onDetail={() => setView({ mode: 'detail', enrollmentId: view.enrollmentId })}
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
  onTest: (programId: string) => void;
  onOpen: (enrollmentId: string) => void;
  onDetail: (enrollmentId: string) => void;
  onCancel: (id: string) => void;
  onDrop: (id: string) => void;
  onToggleRecent: (e: ProgramEnrollment) => void;
}> = ({ activeEnrollments, pastEnrollments, onTest, onOpen, onDetail, onCancel, onDrop, onToggleRecent }) => {
  return (
    <div className="space-y-4">
      {activeEnrollments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Active</h2>
          {activeEnrollments.map((e) => (
            <ActiveRow key={e.id} enrollment={e} onOpen={onOpen} onDetail={onDetail} onCancel={onCancel} onDrop={onDrop} onToggleRecent={onToggleRecent} />
          ))}
        </div>
      )}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Start a program</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CALISTHENICS_PROGRAMS.map((p) => {
            const existing = activeEnrollments.find((a) => a.programId === p.id);
            return (
            <div key={p.id} className="bg-surface border border-white/10 rounded-2xl p-4">
              <div className="font-bold text-lg">{p.name}</div>
              <div className="text-sm text-text-secondary">{p.description}</div>
              <div className="text-xs text-text-secondary mt-1">Target {p.canonicalTarget} {p.unit} · {p.defaultDays} days/week default</div>
              <button
                onClick={() => {
                  if (!existing) onTest(p.id);
                  else if (existing.status === 'needs-retest') onTest(p.id);
                  else onOpen(existing.id);
                }}
                className={`mt-3 font-bold px-4 py-2 rounded-lg text-sm w-full ${existing ? 'bg-emerald-600 text-white' : 'bg-primary text-white'}`}
              >
                {existing ? (existing.status === 'needs-retest' ? 'Retest to continue' : 'Continue') : 'Take test & start'}
              </button>
            </div>
            );
          })}
        </div>
      </div>
      {pastEnrollments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-secondary">Past</h2>
          {pastEnrollments.map((e) => (
            <div key={e.id} className="bg-surface/50 border border-white/5 rounded-2xl p-3 text-sm flex justify-between">
              <span>{e.programId} · {e.status} · target {e.userTarget}</span>
              <button onClick={() => onDetail(e.id)} className="text-primary font-semibold">View</button>
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
  const [retestVal, setRetestVal] = useState('');
  const day = e.unit === 'seconds'
    ? getScaledSession(e.programId, e.currentSessionIndex ?? 0, e.userTarget)
    : getScaledDay(e.programId, e.column, e.currentWeek, e.currentDay, e.userTarget);
  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-bold">{e.programId} <span className="text-xs font-normal text-text-secondary">col {e.column}</span></div>
          <div className="text-sm">{e.unit === 'seconds' ? `Session ${(e.currentSessionIndex ?? 0) + 1}` : `W${e.currentWeek}D${e.currentDay}`} · {formatDayLabel(day.sets, e.unit)} · target {e.userTarget}</div>
          {e.lastCompleted && <div className="text-xs text-text-secondary">Last: {e.lastCompleted.summary}</div>}
          {e.status === 'needs-retest' && <div className="text-xs text-yellow-400 font-semibold">Paused 14+ days — retest to continue or drop.</div>}
        </div>
        <button onClick={() => onDetail(e.id)} className="text-text-secondary"><Icon name="arrow-right" className="w-5 h-5" /></button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {e.status === 'active' ? (
          <button onClick={() => onOpen(e.id)} className="bg-primary text-white font-bold px-4 py-2 rounded-lg">Continue</button>
        ) : (
          <div className="flex gap-2 items-center w-full">
            <input value={retestVal} onChange={(ev) => setRetestVal(ev.target.value)} inputMode="numeric" placeholder={e.unit === 'seconds' ? 'Retest seconds' : 'Retest reps'} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 w-36" />
            <button
              onClick={() => { const v = parseInt(retestVal, 10); if (!Number.isNaN(v) && v >= 0) { retestEnrollment(e.id, v); setRetestVal(''); } }}
              className="bg-primary text-white font-bold px-4 py-2 rounded-lg"
            >Retest & continue</button>
            <button onClick={() => onDrop(e.id)} className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg">Drop</button>
          </div>
        )}
        <button onClick={() => { if (window.confirm('Cancel this program? History is kept.')) onCancel(e.id); }} className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg">Cancel</button>
        <label className="flex items-center gap-2 text-xs text-text-secondary ml-auto">
          <input type="checkbox" checked={e.showInRecent} onChange={() => onToggleRecent(e)} /> Show in Train Recent
        </label>
      </div>
      <details className="text-xs text-text-secondary">
        <summary className="cursor-pointer">Settings</summary>
        <div className="flex gap-2 mt-2 items-center">
          <label>Target <input type="number" value={e.userTarget} min={1} onChange={(ev) => updateEnrollment(e.id, { userTarget: Math.max(1, parseInt(ev.target.value || '1', 10)) })} className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20" /></label>
          <label>Days/wk <input type="number" value={e.daysPerWeek} min={2} max={7} onChange={(ev) => updateEnrollment(e.id, { daysPerWeek: Math.min(7, Math.max(2, parseInt(ev.target.value || '3', 10))) })} className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-16" /></label>
        </div>
      </details>
    </div>
  );
};

// ---------- Test ----------
const TestView: React.FC<{ programId: string; existingId?: string; onDone: (enrollmentId: string) => void; onBack: () => void }> = ({ programId, existingId, onDone, onBack }) => {
  const { enroll, retestEnrollment } = useContext(ProgramContext);
  const def = CALISTHENICS_PROGRAMS.find((p) => p.id === programId);
  const [test, setTest] = useState('');
  const [target, setTarget] = useState(def ? String(def.canonicalTarget) : '');
  const [days, setDays] = useState(def ? String(def.defaultDays) : '3');
  if (!def) return <div>Unknown program</div>;
  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3">
      <h2 className="text-lg font-bold">Initial test — {def.name}</h2>
      <p className="text-sm text-text-secondary">{def.cue} Do one max set with good form, rested. Enter the result.</p>
      <label className="block text-sm">Max {def.unit === 'seconds' ? 'hold (seconds)' : 'reps'}
        <input value={test} onChange={(e) => setTest(e.target.value)} inputMode="numeric" className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2" placeholder={def.unit === 'seconds' ? 'e.g. 45' : 'e.g. 12'} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">Target ({def.unit})
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2" />
        </label>
        <label className="block text-sm">Days / week
          <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={onBack} className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm">Back</button>
        <button
          onClick={() => {
            const t = parseInt(test, 10);
            if (Number.isNaN(t) || t < 0) return;
            if (existingId) { retestEnrollment(existingId, t); onDone(existingId); return; }
            const enr = enroll({ programId, initialTest: t, userTarget: parseInt(target, 10) || def.canonicalTarget, daysPerWeek: parseInt(days, 10) || def.defaultDays });
            onDone(enr.id);
          }}
          className="bg-primary text-white font-bold px-4 py-2 rounded-lg text-sm flex-1"
        >{existingId ? 'Retest & place me' : 'Place me & start'}</button>
      </div>
    </div>
  );
};

// ---------- Player ----------
const PlayerView: React.FC<{ enrollmentId: string; onDone: () => void; onDetail: () => void }> = ({ enrollmentId, onDone, onDetail }) => {
  const { saveCompletedWorkout } = useContext(AppContext);
  const { enrollments, updateEnrollment, completeDay } = useContext(ProgramContext);
  const enrollment = enrollments.find((e) => e.id === enrollmentId);
  const def = CALISTHENICS_PROGRAMS.find((p) => p.id === enrollment?.programId);
  const [actuals, setActuals] = useState<number[]>([]);
  const [restLeft, setRestLeft] = useState<number>(0);
  const [holdLeft, setHoldLeft] = useState<number>(0);
  const [holdRunning, setHoldRunning] = useState(false);
  const [startTime] = useState(Date.now());

  const day = useMemo(() => {
    if (!enrollment || !def) return null;
    return def.sessions
      ? getScaledSession(enrollment.programId, enrollment.currentSessionIndex ?? 0, enrollment.userTarget)
      : getScaledDay(enrollment.programId, enrollment.column, enrollment.currentWeek, enrollment.currentDay, enrollment.userTarget);
  }, [enrollment, def]);

  useEffect(() => {
    if (day) setActuals(day.sets.map((s) => s));
    setRestLeft(0);
    setHoldLeft(0);
    setHoldRunning(false);
  }, [day, enrollmentId]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = window.setTimeout(() => setRestLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [restLeft]);

  useEffect(() => {
    if (!holdRunning || holdLeft <= 0) return;
    const t = window.setTimeout(() => setHoldLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [holdRunning, holdLeft]);

  if (!enrollment || !def || !day) return <div>Enrollment not found.</div>;
  if (enrollment.status !== 'active') {
    return (
      <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
        <p>This program is {enrollment.status}. {enrollment.status === 'needs-retest' ? 'Retest from the hub to continue.' : 'View the plan below.'}</p>
        <div className="flex gap-2">
          <button onClick={onDone} className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg">Back to hub</button>
          <button onClick={onDetail} className="bg-primary text-white font-bold px-4 py-2 rounded-lg">View plan</button>
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
    const session: WorkoutSession = {
      id: `prog-${Date.now()}`,
      routineId: `prog-${def.id}-w${enrollment.currentWeek}d${enrollment.currentDay}s${enrollment.currentSessionIndex ?? 0}`,
      routineName: def.sessions ? `${def.name} S${(enrollment.currentSessionIndex ?? 0) + 1}` : `${def.name} W${enrollment.currentWeek}D${enrollment.currentDay}`,
      startTime,
      endTime: Date.now(),
      exercises: [{
        id: `we-${Date.now()}`,
        exerciseId: def.exerciseId,
        sets,
        restTime: { normal: day.rest, warmup: 60, drop: 30, timed: 10, effort: 180, failure: 300 },
        note: summary,
      }],
      source: 'program',
      programId: def.id,
      updatedAt: Date.now(),
    };
    saveCompletedWorkout(session);
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
    onDone();
  };

  return (
    <div className="bg-surface border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">{def.name} — {def.sessions ? `Session ${(enrollment.currentSessionIndex ?? 0) + 1}` : `W${enrollment.currentWeek}D${enrollment.currentDay}`}</h2>
        <button onClick={onDetail} className="text-xs text-primary font-semibold">Plan</button>
      </div>
      <p className="text-xs text-text-secondary">{def.cue} Rest {day.rest}s between {def.unit === 'seconds' ? 'holds' : 'sets'}. Last is max (≥ {day.minLast}{def.unit === 'seconds' ? 's' : ''}).</p>
      {(restLeft > 0) && <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-2 text-center font-mono">Rest {restLeft}s</div>}
      <div className="space-y-2">
        {day.sets.map((prescribed, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
            <span className="text-xs text-text-secondary w-14">Set {i + 1}</span>
            <span className="text-xs">Goal {prescribed}{def.unit === 'seconds' ? 's' : ''}{i === day.sets.length - 1 ? `+ (min ${day.minLast})` : ''}</span>
            <input
              type="number" min={0} value={actuals[i] ?? prescribed}
              onChange={(e) => setActuals((prev) => prev.map((v, j) => (j === i ? Math.max(0, parseInt(e.target.value || '0', 10)) : v)))}
              className="ml-auto bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right"
            />
            <button onClick={() => setRestLeft(day.rest)} className="text-xs bg-white/10 px-2 py-1 rounded">Rest</button>
            {def.unit === 'seconds' && (
              <button onClick={() => { setHoldLeft(actuals[i] ?? prescribed); setHoldRunning(true); }} className="text-xs bg-indigo-500/30 border border-indigo-500/40 px-2 py-1 rounded">Time it</button>
            )}
          </div>
        ))}
      </div>
      {holdLeft > 0 && (
        <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-3 text-center">
          <div className="font-mono text-2xl">{holdLeft}s</div>
          <button onClick={() => setHoldRunning((v) => !v)} className="text-xs mt-1 px-3 py-1 bg-white/10 rounded">{holdRunning ? 'Pause' : 'Resume'}</button>
        </div>
      )}
      <div className={`text-sm font-semibold ${passed ? 'text-green-400' : 'text-yellow-400'}`}>
        {passed ? 'On target — will advance.' : 'Below target — will repeat this day (canon).'}
      </div>
      <button onClick={finish} className="w-full bg-primary text-white font-bold py-3 rounded-xl">Finish day</button>
      <button onClick={onDone} className="w-full text-xs text-text-secondary">Exit without saving</button>
    </div>
  );
};

// ---------- Detail / grid ----------
const DetailView: React.FC<{ enrollmentId: string; onBack: () => void }> = ({ enrollmentId, onBack }) => {
  const { enrollments, completions } = useContext(ProgramContext);
  const e = enrollments.find((x) => x.id === enrollmentId);
  if (!e) return <div>Not found. <button onClick={onBack}>Back</button></div>;
  const cols = PROGRAM_COL_TABLES[e.programId];
  const def = getProgramDef(e.programId);
  const scale = def ? scaleForTarget(def, e.userTarget) : 1;
  const mine = completions.filter((c) => c.enrollmentId === e.id);
  const doneKey = new Set(mine.map((c) => `${c.week}-${c.day}-${c.sessionIndex ?? 0}`));
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm text-primary font-semibold">Back</button>
      <div className="bg-surface border border-white/10 rounded-2xl p-4">
        <div className="font-bold">{e.programId} · col {e.column} · target {e.userTarget} {e.unit}</div>
        <div className="text-xs text-text-secondary">Total weeks {totalWeeks(e.programId)} · {mine.length} days logged · {e.status}</div>
      </div>
      {cols ? (
        <div className="space-y-2">
          {cols[e.column - 1].map((weekDays, wi) => (
            <div key={wi} className="bg-surface/50 border border-white/5 rounded-xl p-3">
              <div className="text-sm font-bold mb-2">Week {wi + 1}</div>
              <div className="grid grid-cols-3 gap-2">
                {weekDays.map((day, di) => {
                  const done = doneKey.has(`${wi + 1}-${di + 1}-0`);
                  const isNext = (e.status === 'active' || e.status === 'needs-retest') && e.currentWeek === wi + 1 && e.currentDay === di + 1;
                  const scaled = def ? scaleDay(day, scale, def.unit) : day;
                  return (
                    <div key={di} className={`rounded-lg p-2 text-xs border ${done ? 'bg-green-500/10 border-green-500/30' : isNext ? 'bg-primary/10 border-primary/40' : 'bg-white/5 border-white/5'}`}>
                      <div className="font-bold">D{di + 1} {done ? '✓' : ''}</div>
                      <div className="text-text-secondary">{scaled.sets.join('-')}{scaled.sets.length ? ` (≥${scaled.minLast})` : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface/50 border border-white/5 rounded-xl p-3 text-sm">
          {mine.length === 0 ? 'No sessions logged yet.' : mine.slice(0, 20).map((c) => (
            <div key={c.id} className="flex justify-between border-b border-white/5 py-1">
              <span>Session {(c.sessionIndex ?? 0) + 1}</span>
              <span className="text-text-secondary">{c.values.join(' + ')}s · {c.passed ? 'pass' : 'repeat'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramsPage;
