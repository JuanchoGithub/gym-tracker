
import React, { useState, useContext } from 'react';
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

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'SUPPLEMENTS' | 'PROFILE' | 'ACTIVE_WORKOUT';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('TRAIN');
  const { activeWorkout, isWorkoutMinimized, editingTemplate, editingExercise, editingHistorySession, activeHiitSession, isAddingExercisesToWorkout, isAddingExercisesToTemplate, activeQuickTimer } = useContext(AppContext);

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

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-background text-text-primary font-sans flex flex-col overflow-hidden bg-gradient-to-b from-background to-[#020617]">
      <main className={`flex-grow container mx-auto px-3 sm:px-4 py-6 overflow-y-auto relative overscroll-y-none scroll-smooth ${showBottomNav ? 'pb-32' : 'pb-8'}`}>
        {renderContent()}
        {editingExercise && <ExerciseEditorPage />}
      </main>
      <div className="flex-shrink-0 relative z-40">
        {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar />}
        {showBottomNav && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
      </div>
    </div>
  );
};

export default App;