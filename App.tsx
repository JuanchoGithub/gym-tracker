
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

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'SUPPLEMENTS' | 'PROFILE' | 'ACTIVE_WORKOUT' | 'TIMERS';

const App: React.FC = () => {
  // Routing Logic: Initialize state from Hash
  const getPageFromHash = (): Page => {
    const hash = window.location.hash.replace('#/', '').toUpperCase();
    const validPages: Page[] = ['TRAIN', 'HISTORY', 'EXERCISES', 'SUPPLEMENTS', 'PROFILE', 'TIMERS'];
    return validPages.includes(hash as Page) ? (hash as Page) : 'TRAIN';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash());
  
  const { editingTemplate, editingExercise, editingHistorySession, isAddingExercisesToTemplate } = useContext(EditorContext);
  const { activeWorkout, updateActiveWorkout, endWorkout, isWorkoutMinimized, isAddingExercisesToWorkout } = useContext(ActiveWorkoutContext);
  const { activeHiitSession, activeQuickTimer } = useContext(TimerContext);
  const { t } = useI18n();
  const { fontSize } = useContext(AppContext);
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);
  const checkedStaleRef = useRef(false);

  // Listen for Hash Changes (Back Button Support)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // If a timer starts and we aren't on the timer page, go there automatically
  useEffect(() => {
      if ((activeHiitSession || activeQuickTimer) && currentPage !== 'TIMERS') {
          // Optional: Automatically navigate to timer when it starts
          // window.location.hash = '/timers';
      }
  }, [activeHiitSession, activeQuickTimer]);

  useEffect(() => {
    const checkStale = () => {
      if (activeWorkout) {
        // Use lastUpdated if available, otherwise fallback to startTime
        const lastActivity = activeWorkout.lastUpdated || activeWorkout.startTime;
        const duration = Date.now() - lastActivity;
        
        // 3 hours in milliseconds of INACTIVITY
        if (duration > 3 * 60 * 60 * 1000 && !checkedStaleRef.current) {
          setIsStaleModalOpen(true);
          checkedStaleRef.current = true;
        }
      }
    };

    const interval = setInterval(checkStale, 60000); // Check every minute
    
    // Also check on mount/change
    checkStale();
    
    return () => clearInterval(interval);
  }, [activeWorkout]);

  const handleCloseStale = () => {
    // Default to workout start if nothing else
    let lastActivityTime = activeWorkout?.startTime || Date.now();

    if (activeWorkout) {
        // Check last explicit interaction
        if (activeWorkout.lastUpdated && activeWorkout.lastUpdated > lastActivityTime) {
            lastActivityTime = activeWorkout.lastUpdated;
        }
        
        // Also check for completed sets in case lastUpdated wasn't triggered (rare)
        activeWorkout.exercises.forEach(ex => {
            ex.sets.forEach(set => {
                if (set.isComplete && set.completedAt) {
                    if (set.completedAt > lastActivityTime) {
                        lastActivityTime = set.completedAt;
                    }
                }
            });
        });
        
        // Sanity check: End time shouldn't be in future (should be impossible given logic, but safe)
        if (lastActivityTime > Date.now()) {
            lastActivityTime = Date.now();
        }
    }
    
    endWorkout(lastActivityTime);
    setIsStaleModalOpen(false);
  };

  const handleContinueStale = () => {
    setIsStaleModalOpen(false);
    // Reset ref to prevent immediate re-trigger
    checkedStaleRef.current = false;
    // Update the workout timestamp to prevent the check from firing again immediately
    if (activeWorkout) {
        updateActiveWorkout({ ...activeWorkout, lastUpdated: Date.now() });
    }
  };

  const handleNavigate = (page: Page) => {
    window.location.hash = `/${page.toLowerCase()}`;
  }

  const renderContent = () => {
    if (isAddingExercisesToWorkout || isAddingExercisesToTemplate) {
      return <AddExercisePage />;
    }
    if (editingHistorySession) {
      return <HistoryWorkoutEditorPage />;
    }
    if (editingTemplate) {
      return <TemplateEditorPage />;
    }
    if (activeWorkout && !isWorkoutMinimized) {
      return <ActiveWorkoutPage />;
    }
    
    // Standard Navigation
    switch (currentPage) {
      case 'TRAIN': return <TrainPage />;
      case 'HISTORY': return <HistoryPage />;
      case 'EXERCISES': return <ExercisesPage />;
      case 'SUPPLEMENTS': return <SupplementPage />;
      case 'PROFILE': return <ProfilePage />;
      // Timer page is handled outside to keep it mounted
      default: return <TrainPage />;
    }
  }

  const showBottomNav = (!activeWorkout || isWorkoutMinimized) && !editingTemplate && !editingExercise && !editingHistorySession;
  const isTimerActive = !!(activeHiitSession || activeQuickTimer);

  // Determine padding
  const paddingBottomClass = (() => {
    if (showBottomNav) {
        if (activeWorkout && isWorkoutMinimized) return 'pb-52'; 
        return 'pb-32';
    }
    if (activeWorkout && isWorkoutMinimized) return 'pb-24';
    return 'pb-8';
  })();

  // Adjust side margins based on font size to maximize space for text
  const paddingXClass = fontSize === 'xl' ? 'px-1 sm:px-2' : (fontSize === 'large' ? 'px-2 sm:px-3' : 'px-3 sm:px-4');

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-background text-text-primary font-sans flex flex-col overflow-hidden bg-gradient-to-b from-background to-[#020617]">
      <SilentAudioPlayer />
      <NotificationManager />
      
      {/* Persistent Timer View: Kept mounted but hidden if not on 'TIMERS' page */}
      {isTimerActive && (
        <div className={currentPage === 'TIMERS' ? 'fixed inset-0 z-50 bg-background' : 'hidden'}>
            <TimersPage />
            {/* Floating button to leave timer view without stopping it */}
            <button 
                onClick={() => window.history.back()} 
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white z-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      )}

      <main className={`flex-grow container mx-auto ${paddingXClass} py-6 overflow-y-auto overflow-x-hidden relative overscroll-y-none scroll-smooth ${paddingBottomClass}`}>
        {renderContent()}
        {editingExercise && <ExerciseEditorPage />}
      </main>
      
      {/* Z-Index Management: Nav wrapper is z-40, Modals are z-100 */}
      <div className="flex-shrink-0 relative z-40">
        {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar withBottomNav={showBottomNav} />}
        {showBottomNav && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
      </div>
      
      {/* Floating Timer Button (if active but not on timer page) */}
      {isTimerActive && currentPage !== 'TIMERS' && (
          <button 
            onClick={() => handleNavigate('TIMERS')}
            className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center animate-bounce text-white border-2 border-white/20"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
    </div>
  );
};

export default App;
