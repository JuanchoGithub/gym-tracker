import React, { useContext } from 'react';
import { ProgramContext } from '../../contexts/ProgramContext';
import { getProgramDef, getScaledDay, getScaledSession, formatDayLabel } from '../../utils/calisthenicsEngine';

export const requestProgramContinue = (enrollmentId: string) => {
  try { window.localStorage.setItem('programContinueId', enrollmentId); } catch { /* noop */ }
  window.location.hash = '/programs';
};

const ContinueProgramCard: React.FC = () => {
  const { enrollments, cancelEnrollment } = useContext(ProgramContext);
  const visible = enrollments.filter((e) => e.status === 'active' || e.status === 'needs-retest');
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((e) => {
        const def = getProgramDef(e.programId);
        if (!def) return null;
        const day = def.sessions
          ? getScaledSession(e.programId, e.currentSessionIndex ?? 0, e.userTarget)
          : getScaledDay(e.programId, e.column, e.currentWeek, e.currentDay, e.userTarget);
        const label = def.sessions
          ? `Session ${(e.currentSessionIndex ?? 0) + 1} — ${formatDayLabel(day.sets, def.unit)}`
          : `W${e.currentWeek}D${e.currentDay} — ${formatDayLabel(day.sets, def.unit)}`;
        return (
          <div key={e.id} className="bg-surface border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-text-secondary font-bold">
                {e.status === 'needs-retest' ? 'Program paused — retest to continue' : `Continue ${def.name}`}
              </div>
              <div className="font-bold text-text-primary truncate">{label}</div>
              {e.lastCompleted && (
                <div className="text-xs text-text-secondary truncate">Last: {e.lastCompleted.summary}</div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => requestProgramContinue(e.id)}
                className="bg-primary text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                {e.status === 'needs-retest' ? 'Retest' : 'Continue'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Cancel this program? History is kept.')) cancelEnrollment(e.id);
                }}
                className="bg-white/5 border border-white/10 text-text-secondary px-3 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContinueProgramCard;
