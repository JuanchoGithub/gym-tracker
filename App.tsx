
import React, { useState, useContext, useEffect, useRef } from 'react';
import BottomNavBar from './components/common/BottomNavBar';
import TrainPage from './pages/TrainPage';
import HistoryPage from './pages/HistoryPage';
import ExercisesPage from './pages/ExercisesPage';
import ProfilePage from './pages/ProfilePage';
import TimersPage from './pages/TimersPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import { AppContext } from './contexts/AppContext';
import { ActiveWorkoutContext } from './contexts/ActiveWorkoutContext';
import { TimerContext } from './contexts/TimerContext';
import { EditorContext } from './contexts/EditorContext';
import MinimizedWorkoutBar from './components/workout/MinimizedWorkoutBar';
import TemplateEditorPage from './pages/TemplateEditorPage';
import ExerciseEditorPage from './pages/ExerciseEditorPage';
import HistoryWorkoutEditorPage from './pages/HistoryWorkoutEditorPage';
import AddExercisePage from './pages/AddExercisePage';
import SupplementPage from './pages/SupplementPage';
import ConfirmModal from './components/modals/ConfirmModal';
import { useI18n } from './hooks/useI18n';
import SilentAudioPlayer from './components/common/SilentAudioPlayer';
import NotificationManager from './components/managers/NotificationManager';
import Modal from './components/common/Modal';
// FIX: Added missing import for Icon component
import { Icon } from './components/common/Icon';
import { Routine, Exercise } from './types';

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'SUPPLEMENTS' | 'PROFILE' | 'ACTIVE_WORKOUT' | 'TIMERS';

declare var LZString: any;

const App: React.FC = () => {
  // Routing Logic: Initialize state from Hash
  const getPageFromHash = (): Page => {
    const hash = window.location.hash.split('?')[0].replace('#/', '').toUpperCase();
    const validPages: Page[] = ['TRAIN', 'HISTORY', 'EXERCISES', 'SUPPLEMENTS', 'PROFILE', 'TIMERS'];
    return validPages.includes(hash as Page) ? (hash as Page) : 'TRAIN';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash());
  const { upsertRoutine, rawExercises, setRawExercises, fontSize } = useContext(AppContext);
  const { editingTemplate, editingExercise, editingHistorySession, isAddingExercisesToTemplate } = useContext(EditorContext);
  const { activeWorkout, updateActiveWorkout, endWorkout, isWorkoutMinimized, isAddingExercisesToWorkout } = useContext(ActiveWorkoutContext);
  const { activeHiitSession, activeQuickTimer } = useContext(TimerContext);
  const { t } = useI18n();
  
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);
  const checkedStaleRef = useRef(false);

  // Deep Link Import State
  const [pendingImport, setPendingImport] = useState<any>(null);

  // Listen for Hash Changes (Back Button & Deep Links)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      // Handle Deep Link Import
      if (hash.startsWith('#/import/')) {
        const compressedData = hash.replace('#/import/', '');
        try {
          const decoded = LZString.decompressFromEncodedURIComponent(compressedData);
          if (decoded) {
            const payload = JSON.parse(decoded);
            if (payload.type === 'fortachon_workout' && payload.routine) {
              setPendingImport(payload);
            }
          }
        } catch (e) {
          console.error("Deep link import failed", e);
        }
        // Clean up hash to prevent double-import on refresh/back
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/train');
      }

      setCurrentPage(getPageFromHash());
    };
    
    window.addEventListener('hashchange', handleHashChange);
    // Initial check on mount
    handleHashChange();
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    
    const routine: Routine = pendingImport.routine;
    const customExercises: Exercise[] = pendingImport.customExercises || [];

    if (customExercises.length > 0) {
      setRawExercises(prev => {
        const newExs = [...prev];
        customExercises.forEach(ce => {
          if (!newExs.some(e => e.id === ce.id)) {
            newExs.push(ce);
          }
        });
        return newExs;
      });
    }

    upsertRoutine(routine);
    setPendingImport(null);
    window.location.hash = '/train';
  };

  useEffect(() => {
    const checkStale = () => {
      if (activeWorkout) {
        const lastActivity = activeWorkout.lastUpdated || activeWorkout.startTime;
        const duration = Date.now() - lastActivity;
        if (duration > 3 * 60 * 60 * 1000 && !checkedStaleRef.current) {
          setIsStaleModalOpen(true);
          checkedStaleRef.current = true;
        }
      }
    };
    const interval = setInterval(checkStale, 60000);
    checkStale();
    return () => clearInterval(interval);
  }, [activeWorkout]);

  const handleCloseStale = () => {
    let lastActivityTime = activeWorkout?.startTime || Date.now();
    if (activeWorkout) {
        if (activeWorkout.lastUpdated && activeWorkout.lastUpdated > lastActivityTime) {
            lastActivityTime = activeWorkout.lastUpdated;
        }
        activeWorkout.exercises.forEach(ex => {
            ex.sets.forEach(set => {
                if (set.isComplete && set.completedAt && set.completedAt > lastActivityTime) {
                    lastActivityTime = set.completedAt;
                }
            });
        });
        if (lastActivityTime > Date.now()) lastActivityTime = Date.now();
    }
    endWorkout(lastActivityTime);
    setIsStaleModalOpen(false);
  };

  const handleContinueStale = () => {
    setIsStaleModalOpen(false);
    checkedStaleRef.current = false;
    if (activeWorkout) {
        updateActiveWorkout({ ...activeWorkout, lastUpdated: Date.now() });
    }
  };

  const handleNavigate = (page: Page) => {
    window.location.hash = `/${page.toLowerCase()}`;
  }

  const renderContent = () => {
    if (isAddingExercisesToWorkout || isAddingExercisesToTemplate) return <AddExercisePage />;
    if (editingHistorySession) return <HistoryWorkoutEditorPage />;
    if (editingTemplate) return <TemplateEditorPage />;
    if (editingExercise) return <ExerciseEditorPage />;
    if (activeWorkout && !isWorkoutMinimized) return <ActiveWorkoutPage />;
    
    switch (currentPage) {
      case 'TRAIN': return <TrainPage />;
      case 'HISTORY': return <HistoryPage />;
      case 'EXERCISES': return <ExercisesPage />;
      case 'SUPPLEMENTS': return <SupplementPage />;
      case 'PROFILE': return <ProfilePage />;
      default: return <TrainPage />;
    }
  }

  const showBottomNav = (!activeWorkout || isWorkoutMinimized) && !editingTemplate && !editingExercise && !editingHistorySession;
  const isTimerActive = !!(activeHiitSession || activeQuickTimer);
  const paddingBottomClass = showBottomNav ? (activeWorkout && isWorkoutMinimized ? 'pb-52' : 'pb-32') : (activeWorkout && isWorkoutMinimized ? 'pb-24' : 'pb-8');
  const paddingXClass = fontSize === 'xl' ? 'px-1 sm:px-2' : (fontSize === 'large' ? 'px-2 sm:px-3' : 'px-3 sm:px-4');

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-background text-text-primary font-sans flex flex-col overflow-hidden bg-gradient-to-b from-background to-[#020617]">
      <SilentAudioPlayer />
      <NotificationManager />
      
      {isTimerActive && (
        <div className={currentPage === 'TIMERS' ? 'fixed inset-0 z-50 bg-background' : 'hidden'}>
            <TimersPage />
            <button onClick={() => window.history.back()} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white z-50">
                <Icon name="x" className="h-6 w-6" />
            </button>
        </div>
      )}

      <main className={`flex-grow container mx-auto ${paddingXClass} py-6 overflow-y-auto overflow-x-hidden relative overscroll-y-none scroll-smooth ${paddingBottomClass}`}>
        {renderContent()}
      </main>
      
      <div className="flex-shrink-0 relative z-40">
        {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar withBottomNav={showBottomNav} />}
        {showBottomNav && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
      </div>
      
      {isTimerActive && currentPage !== 'TIMERS' && (
          <button onClick={() => handleNavigate('TIMERS')} className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center animate-bounce text-white border-2 border-white/20">
              <Icon name="stopwatch" className="h-8 w-8" />
          </button>
      )}

      <ConfirmModal 
        isOpen={isStaleModalOpen}
        onClose={handleContinueStale}
        onConfirm={handleCloseStale}
        title={t('stale_workout_title')}
        message={t('stale_workout_message')}
        confirmText={t('stale_workout_confirm')}
        cancelText={t('stale_workout_cancel')}
        confirmButtonClass="bg-primary hover:bg-sky-600"
      />

      {/* Deep Link Import Modal */}
      <Modal isOpen={!!pendingImport} onClose={() => setPendingImport(null)} title={t('import_workout_title')}>
         <div className="space-y-4">
            <p className="text-text-secondary">{t('import_workout_success', { name: pendingImport?.routine?.name })}</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingImport(null)} className="flex-1 bg-surface border border-white/10 text-text-secondary font-bold py-3 rounded-xl">{t('common_cancel')}</button>
              <button onClick={handleConfirmImport} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-lg">{t('common_confirm')}</button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default App;
