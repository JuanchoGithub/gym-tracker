import React, { useState, useContext } from 'react';
import BottomNavBar from './components/common/BottomNavBar';
import TrainPage from './pages/TrainPage';
import HistoryPage from './pages/HistoryPage';
import ExercisesPage from './pages/ExercisesPage';
import ProfilePage from './pages/ProfilePage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import { AppContext } from './contexts/AppContext';
import MinimizedWorkoutBar from './components/workout/MinimizedWorkoutBar';
import TemplateEditorPage from './pages/TemplateEditorPage';
import ExerciseEditorPage from './pages/ExerciseEditorPage';

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'PROFILE' | 'ACTIVE_WORKOUT';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('TRAIN');
  const { activeWorkout, isWorkoutMinimized, editingTemplate, editingExercise } = useContext(AppContext);

  const renderPage = () => {
    switch (currentPage) {
      case 'TRAIN':
        return <TrainPage />;
      case 'HISTORY':
        return <HistoryPage />;
      case 'EXERCISES':
        return <ExercisesPage />;
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
    if (editingExercise) {
      return <ExerciseEditorPage />;
    }
    if (editingTemplate) {
      return <TemplateEditorPage />;
    }
    if (activeWorkout && !isWorkoutMinimized) {
      return <ActiveWorkoutPage />;
    }
    return renderPage();
  }
  
  const mainPaddingBottom = activeWorkout && isWorkoutMinimized ? 'pb-32' : 'pb-20';

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans flex flex-col">
      <main className={`flex-grow container mx-auto px-2 sm:px-4 py-4 ${mainPaddingBottom}`}>
        {renderContent()}
      </main>
      {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar />}
      {(!activeWorkout || isWorkoutMinimized) && !editingTemplate && !editingExercise && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
    </div>
  );
};

export default App;