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

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'TIMERS' | 'PROFILE' | 'ACTIVE_WORKOUT';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('TRAIN');
  const { activeWorkout, isWorkoutMinimized, editingTemplate, editingExercise, editingHistorySession, activeHiitSession } = useContext(AppContext);

  const renderPage = () => {
    if (activeHiitSession) {
      return <TimersPage />;
    }
    switch (currentPage) {
      case 'TRAIN':
        return <TrainPage />;
      case 'HISTORY':
        return <HistoryPage />;
      case 'EXERCISES':
        return <ExercisesPage />;
      case 'TIMERS':
        return <TimersPage />;
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

  return (
    <div className="h-screen bg-background text-text-primary font-sans flex flex-col overflow-hidden">
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-4 overflow-y-auto relative">
        {renderContent()}
        {editingExercise && <ExerciseEditorPage />}
      </main>
      <div className="flex-shrink-0">
        {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar />}
        {(!activeWorkout || isWorkoutMinimized) && !editingTemplate && !editingExercise && !editingHistorySession && !activeHiitSession && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
      </div>
    </div>
  );
};

export default App;