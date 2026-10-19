import React, { useContext } from 'react';
import { ProgramContext } from '../../contexts/ProgramContext';
import { getProgramDef, getScaledDay, getScaledSession, formatDayLabel } from '../../utils/calisthenicsEngine';
import { progName } from '../../utils/programI18n';
import { ProgramEnrollment } from '../../types';
import { useI18n } from '../../hooks/useI18n';

export const requestProgramContinue = (enrollmentId: string) => {
  try { window.localStorage.setItem('programContinueId', enrollmentId); } catch { /* noop */ }
  window.location.hash = '/programs';
};

const ContinueProgramCard: React.FC = () => {
  const { enrollments, cancelEnrollment, plan } = useContext(ProgramContext);
  const { t } = useI18n();
  const active = enrollments.filter((e) => e.status === 'active' || e.status === 'needs-retest');
  const planEnrollments = plan.programIds
    .map((pid) => active.find((e) => e.programId === pid))
    .filter((e): e is ProgramEnrollment => Boolean(e));
  const inPlan = new Set(plan.programIds);
  const individual = active.filter((e) => !inPlan.has(e.programId));
  if (planEnrollments.length === 0 && individual.length === 0) return null;
  const runnable = planEnrollments.filter((e) => e.status === 'active');

  return (
    <div className="space-y-2">
      {planEnrollments.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold">{t('programs_card_plan_label')}</div>
            <div className="font-bold text-text-primary truncate">
              {planEnrollments.map((e, i) => `${i + 1}. ${t(progName(e.programId))}${e.status === 'needs-retest' ? ` (${t('programs_paused')})` : ''}`).join(' → ')}
            </div>
            <div className="text-xs text-text-secondary">
              {planEnrollments.length === 1 ? t('programs_card_plan_sub_one') : t('programs_card_plan_sub_many', { count: planEnrollments.length })}
            </div>
          </div>
          <button
            onClick={() => requestProgramContinue('__plan__')}
            disabled={runnable.length === 0}
            className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-sm flex-shrink-0 disabled:opacity-40"
          >
            {t('programs_card_start_plan')}
          </button>
        </div>
      )}
      {individual.map((e) => {
        const def = getProgramDef(e.programId);
        if (!def) return null;
        const day = def.sessions
          ? getScaledSession(e.programId, e.currentSessionIndex ?? 0, e.userTarget)
          : getScaledDay(e.programId, e.column, e.currentWeek, e.currentDay, e.userTarget);
        const label = def.sessions
          ? `${t('programs_session_n', { n: (e.currentSessionIndex ?? 0) + 1 })} — ${formatDayLabel(day.sets, def.unit)}`
          : `W${e.currentWeek}D${e.currentDay} — ${formatDayLabel(day.sets, def.unit)}`;
        return (
          <div key={e.id} className="bg-surface border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-text-secondary font-bold">
                {e.status === 'needs-retest' ? t('programs_card_paused') : t('programs_card_continue', { name: t(progName(e.programId)) })}
              </div>
              <div className="font-bold text-text-primary truncate">{label}</div>
              {e.lastCompleted && (
                <div className="text-xs text-text-secondary truncate">{t('programs_last', { summary: e.lastCompleted.summary })}</div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => requestProgramContinue(e.id)}
                className="bg-primary text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                {e.status === 'needs-retest' ? t('programs_retest_to_continue') : t('programs_continue')}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(t('programs_cancel_confirm'))) cancelEnrollment(e.id);
                }}
                className="bg-white/5 border border-white/10 text-text-secondary px-3 py-2 rounded-lg text-sm"
              >
                {t('programs_cancel')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ContinueProgramCard;
