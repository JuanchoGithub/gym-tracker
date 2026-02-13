
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ActiveWorkoutContext } from '../contexts/ActiveWorkoutContext';
import { useI18n } from '../hooks/useI18n';
import { Routine, WorkoutSession } from '../types';
import { useMeasureUnit } from '../hooks/useWeight';
import { formatTime, formatDurationCompact } from '../utils/timeUtils';
import { findBestSet } from '../utils/workoutUtils';
import { Icon } from '../components/common/Icon';
import ConfirmModal from '../components/modals/ConfirmModal';
import Modal from '../components/common/Modal';
import HistoryDetailModal from '../components/modals/HistoryDetailModal';
import HistoryChartsTab from '../components/history/HistoryChartsTab';
import { TranslationKey } from '../contexts/I18nContext';

const HISTORY_PAGE_SIZE = 10;

const HistoryPage: React.FC = () => {
  const { history, getExerciseById, deleteHistorySession, upsertRoutine, startHistoryEdit, routines } = useContext(AppContext);
  const { startWorkout } = useContext(ActiveWorkoutContext);
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewingSession, setViewingSession] = useState<WorkoutSession | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'charts'>('list');
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);

  const [deletingSession, setDeletingSession] = useState<WorkoutSession | null>(null);
  const [templatingSession, setTemplatingSession] = useState<WorkoutSession | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');

  const confirmDelete = () => {
    if (deletingSession) {
      deleteHistorySession(deletingSession.id);
      setDeletingSession(null);
    }
  };

  const confirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (templatingSession && newTemplateName.trim()) {
      const originalRoutine = routines.find(r => r.id === templatingSession.routineId);
      const newTemplate: Routine = {
        id: `template-${Date.now()}`,
        name: newTemplateName.trim(),
        description: `Based on workout from ${new Date(templatingSession.startTime).toLocaleDateString()}`,
        exercises: templatingSession.exercises,
        isTemplate: true,
        originId: templatingSession.routineId,
        routineType: originalRoutine?.routineType || 'strength',
      };
      upsertRoutine(newTemplate);
      setTemplatingSession(null);
      setNewTemplateName('');
    }
  };

  const handleRepeatWorkout = (session: WorkoutSession) => {
    const originalRoutine = routines.find(r => r.id === session.routineId);
    const routineFromHistory: Routine = {
      id: session.routineId,
      name: session.routineName,
      description: `Repeat of workout from ${new Date(session.startTime).toLocaleDateString()}`,
      exercises: session.exercises,
      isTemplate: false, // Not a template itself
      lastUsed: Date.now(),
      originId: session.routineId,
      routineType: originalRoutine?.routineType || 'strength',
    };
    startWorkout(routineFromHistory);
  };

  const visibleHistory = useMemo(() => {
    return history.slice(0, visibleCount);
  }, [history, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + HISTORY_PAGE_SIZE);
  };

  if (history.length === 0) {
    return (
      <div className="text-center text-text-secondary">
        <h1 className="text-3xl font-bold mb-4">{t('nav_history')}</h1>
        <p>{t('history_page_no_workouts')}</p>
      </div>
    );
  }

  const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
    <div className="flex flex-col justify-between bg-slate-900/50 p-2 rounded-lg h-full">
      <div className="flex items-center space-x-1.5 mb-0.5">
        <div className="text-primary w-4 h-4">{icon}</div>
        <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wide">{label}</div>
      </div>
      <div className="font-bold text-base leading-none text-right">{value}</div>
    </div>
  );

  return (
    <>
      <div className="space-y-4 sm:space-y-6 pb-10" onClick={() => { if (menuOpenId) setMenuOpenId(null) }}>
        <h1 className="text-3xl font-bold text-center">{t('nav_history')}</h1>

        <div className="flex justify-center border-b border-secondary/20">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 font-medium ${activeTab === 'list' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
          >
            {t('nav_history')}
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 font-medium ${activeTab === 'charts' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
          >
            {t('tab_graphs')}
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="space-y-4">
            {visibleHistory.map((session: WorkoutSession) => {
              const titleLen = session.routineName.length;
              const titleClass = titleLen > 35 ? 'text-xs tracking-tight' : titleLen > 25 ? 'text-sm' : titleLen > 18 ? 'text-base' : 'text-lg';
              const totalTime = session.endTime > 0 ? formatDurationCompact(Math.round((session.endTime - session.startTime) / 1000)) : 'N/A';
              const totalVolume = session.exercises.reduce((total, ex) => {
                return total + ex.sets.reduce((exTotal, set) => exTotal + (set.isComplete ? (set.weight * set.reps) : 0), 0);
              }, 0);

              return (
                <div key={session.id} className="bg-surface rounded-lg shadow cursor-pointer hover:bg-slate-700 transition-colors">
                  <div className="p-3 sm:p-4" onClick={() => setViewingSession(session)}>
                    <div className="flex justify-between items-start mb-3 overflow-hidden">
                      <div className="min-w-0 flex-1 pr-2">
                        <h2 className={`font-bold ${titleClass} text-primary whitespace-nowrap overflow-hidden text-ellipsis leading-tight`}>{session.routineName}</h2>
                        <span className="text-sm text-text-secondary block">
                          {new Date(session.startTime).toLocaleString()}
                        </span>
                      </div>
                      <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setMenuOpenId(mid => mid === session.id ? null : session.id)} className="p-2 -mt-2 -mr-2 text-text-secondary hover:text-primary">
                          <Icon name="ellipsis" />
                        </button>
                        {menuOpenId === session.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-slate-600 rounded-md shadow-lg z-10">
                            <button onClick={(e) => { e.stopPropagation(); startHistoryEdit(session); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-500 flex items-center gap-2"><Icon name="edit" className="w-4 h-4" />{t('history_menu_edit')}</button>
                            <button onClick={(e) => { e.stopPropagation(); handleRepeatWorkout(session); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-500 flex items-center gap-2"><Icon name="repeat" className="w-4 h-4" />{t('history_menu_repeat')}</button>
                            <button onClick={(e) => { e.stopPropagation(); setTemplatingSession(session); setNewTemplateName(session.routineName); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-500 flex items-center gap-2"><Icon name="save" className="w-4 h-4" />{t('history_menu_save_template')}</button>
                            <button onClick={(e) => { e.stopPropagation(); setDeletingSession(session); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-500 flex items-center gap-2"><Icon name="trash" className="w-4 h-4" />{t('history_menu_delete')}</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                      <StatItem icon={<Icon name="history" className="w-full h-full" />} label={t('history_total_time')} value={totalTime} />
                      <StatItem icon={<Icon name="weight" className="w-full h-full" />} label={t('history_total_volume')} value={`${displayWeight(totalVolume, true)} ${t(`workout_${weightUnit}` as TranslationKey)}`} />
                      <StatItem icon={<Icon name="trophy" className="w-full h-full" />} label={t('history_prs')} value={session.prCount || 0} />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 text-xs text-text-secondary font-semibold border-b border-secondary/20 pb-1">
                        <span>Exercise</span>
                        <span className="text-right">{t('history_best_set')}</span>
                      </div>
                      {session.exercises.map(ex => {
                        const exerciseInfo = getExerciseById(ex.exerciseId);
                        const bestSet = findBestSet(ex.sets);
                        const normalSetsCount = ex.sets.filter(s => ['normal', 'failure', 'timed'].includes(s.type)).length;
                        return (
                          <div key={ex.id} className="grid grid-cols-2 items-center">
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-text-primary block whitespace-nowrap overflow-hidden text-ellipsis">{normalSetsCount}x {exerciseInfo?.name || t('history_page_unknown_exercise')}</span>
                            </div>
                            <div className="text-right text-text-secondary whitespace-nowrap">
                              {bestSet ? `${displayWeight(bestSet.weight)} ${t(`workout_${weightUnit}` as TranslationKey)} x ${bestSet.reps} ${t('workout_reps')}` : '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleCount < history.length && (
              <button
                onClick={handleLoadMore}
                className="w-full py-3 text-center bg-surface-highlight/20 text-primary font-semibold rounded-lg hover:bg-surface-highlight/40 transition-colors"
              >
                Load More
              </button>
            )}
          </div>
        )}

        {activeTab === 'charts' && <HistoryChartsTab history={history} />}
      </div>

      {viewingSession && (
        <HistoryDetailModal
          isOpen={!!viewingSession}
          onClose={() => setViewingSession(null)}
          session={viewingSession}
        />
      )}

      {deletingSession && (
        <ConfirmModal
          isOpen={!!deletingSession}
          onClose={() => setDeletingSession(null)}
          onConfirm={confirmDelete}
          title={t('history_delete_confirm_title')}
          message={t('history_delete_confirm_message')}
          confirmText={t('common_delete')}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}

      {templatingSession && (
        <Modal isOpen={!!templatingSession} onClose={() => setTemplatingSession(null)} title={t('history_save_template_title')}>
          <form onSubmit={confirmSaveTemplate}>
            <label htmlFor="template-name" className="block text-sm font-medium text-text-secondary mb-1">{t('history_template_name_label')}</label>
            <input
              id="template-name"
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mb-4"
              placeholder={t('history_template_name_placeholder')}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setTemplatingSession(null)} className="bg-secondary px-4 py-2 rounded-lg">{t('common_cancel')}</button>
              <button type="submit" className="bg-primary px-4 py-2 rounded-lg">{t('common_save')}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

export default HistoryPage;
