import React, { useState, useContext } from 'react';
import BottomNavBar from './components/common/BottomNavBar';
import TrainPage from './pages/TrainPage';
import HistoryPage from './pages/HistoryPage';
import ExercisesPage from './pages/ExercisesPage';
import ProfilePage from './pages/ProfilePage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import { AppContext } from './contexts/AppContext';
import MinimizedWorkoutBar from './components/workout/MinimizedWorkoutBar';

export type Page = 'TRAIN' | 'HISTORY' | 'EXERCISES' | 'PROFILE' | 'ACTIVE_WORKOUT';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('TRAIN');
  const { activeWorkout, isWorkoutMinimized } = useContext(AppContext);

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

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans flex flex-col">
      <main className="flex-grow container mx-auto p-4 pb-32">
        {activeWorkout && !isWorkoutMinimized ? (
          <ActiveWorkoutPage />
        ) : (
          renderPage()
        )}
      </main>
      {activeWorkout && isWorkoutMinimized && <MinimizedWorkoutBar />}
      {(!activeWorkout || isWorkoutMinimized) && <BottomNavBar currentPage={currentPage} onNavigate={handleNavigate} />}
    </div>
  );
};

export default App;
