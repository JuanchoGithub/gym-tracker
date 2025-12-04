
import React, { useContext } from 'react';
import { ActiveWorkoutContext } from '../../contexts/ActiveWorkoutContext';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { Icon } from '../common/Icon';
import WorkoutRestTimer from './WorkoutRestTimer';

interface MinimizedWorkoutBarProps {
    withBottomNav: boolean;
}

const MinimizedWorkoutBar: React.FC<MinimizedWorkoutBarProps> = ({ withBottomNav }) => {
    const { activeWorkout, maximizeWorkout } = useContext(ActiveWorkoutContext);
    const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);

    if (!activeWorkout) return null;

    const positionClasses = withBottomNav 
        ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] border-b border-white/10' 
        : 'bottom-0 pb-[env(safe-area-inset-bottom)]';

    return (
        <div className={`fixed left-0 right-0 z-40 bg-primary shadow-lg w-full transition-all duration-300 ${positionClasses}`}>
            <button
                onClick={maximizeWorkout}
                className="h-14 text-white flex items-center justify-between px-4 z-40 w-full"
                aria-label="Maximize workout"
            >
                <div className="flex items-center space-x-3 overflow-hidden">
                    <Icon name="dumbbell" className="flex-shrink-0" />
                    <span className="font-bold truncate">{activeWorkout.routineName}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="font-mono text-lg">{elapsedTime}</span>
                    <Icon name="arrow-up" className="w-5 h-5" />
                </div>
            </button>
            <div className="px-4 pb-2">
                <WorkoutRestTimer />
            </div>
        </div>
    );
};

export default MinimizedWorkoutBar;
