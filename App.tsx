
import React, { useState, useContext, useEffect, useRef } from 'react';
import BottomNavBar from './components/common/BottomNavBar';
import TrainPage from './pages/TrainPage';
import HistoryPage from './pages/HistoryPage';
import ExercisesPage from './pages/ExercisesPage';
import ProfilePage from './pages/ProfilePage';
import TimersPage from './pages/TimersPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import { AppContext } from './contexts/AppContext';
import MinimizedWorkoutBar from './components/workout/MinimizedWorkoutBar';
import TemplateEditorPage from './pages/TemplateEditorPage';
import ExerciseEditorPage from './pages/ExerciseEditorPage';
import HistoryWorkoutEditorPage from './pages/HistoryWorkoutEditorPage';
import AddExercisePage from './pages/AddExercisePage';
import SupplementPage from './pages/SupplementPage';
import ConfirmModal from './components/modals/ConfirmModal';
import { useI18n } from './hooks/useI18n';

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'SUPPLEMENTS' | 'PROFILE' | 'ACTIVE_WORKOUT';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('TRAIN');
  const { activeWorkout, isWorkoutMinimized, editingTemplate, editingExercise, editingHistorySession, activeHiitSession, isAddingExercisesToWorkout, isAddingExercisesToTemplate, activeQuickTimer, endWorkout } = useContext(AppContext);
  const { t } = useI18n();
  const [isStaleModalOpen, setIsStaleModalOpen] = useState(false);
  const checkedStaleRef = useRef(false);

  useEffect(() => {
    if (activeWorkout && !checkedStaleRef.current) {
      const duration = Date.now() - activeWorkout.startTime;
      // 3 hours in milliseconds
      if (duration > 3 * 60 * 60 * 1000) {
        setIsStaleModalOpen(true);
      }
      checkedStaleRef.current = true;
    }
  }, [activeWorkout]);

  const handleCloseStale = () => {
    endWorkout();
    setIsStaleModalOpen(false);
  };

  const handleContinueStale = () => {
    setIsStaleModalOpen(false);
  };

  const renderPage = () => {
    if (activeHiitSession || activeQuickTimer) {
      return <TimersPage />;
    }
    switch (currentPage) {
      case 'TRAIN':
        return <TrainPage />;
      case 'HISTORY':
        return <HistoryPage />;
      case 'EXERCISES':
        return <ExercisesPage />;
      case 'SUPPLEMENTS':
        return <SupplementPage />;
      case 'PROFILE':
        return <ProfilePage />;
      default:
        return <TrainPage />;
    }
  };
  
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
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
    return renderPage();
  }

  const showBottomNav = (!activeWorkout || isWorkoutMinimized) && !editingTemplate && !editingExercise && !editingHistorySession && !activeHiitSession && !activeQuickTimer;

  const paddingBottomClass = (() => {
    if (showBottomNav) {
        if (activeWorkout && isWorkoutMinimized) return 'pb-52'; // Nav (4.5rem) + Min Bar (~3.5rem) + Timer space
        return 'pb-32'; // Nav only
    }
    if (activeWorkout && isWorkoutMinimized) return 'pb-24'; // Minimized Bar only
    return 'pb-8'; // Nothing
  })();

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-background text-text-primary font-sans flex flex-col overflow-hidden bg-gradient-to-b from-background to-[#020617]">
      <main className={`flex-grow container mx-auto px-3 sm:px-4 py-6 overflow-y-auto overflow-x-hidden relative overscroll-y-none scroll-smooth ${paddingBottomClass}`}>
        {renderContent()}
        {editingExercise && <ExerciseEditorPage />}
      </main>
      <div className="flex-shrink-0 relative z-40">
        {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar withBottomNav={showBottomNav} />}
        {showBottomNav && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
      </div>

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
