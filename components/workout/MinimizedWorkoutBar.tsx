import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { Icon } from '../common/Icon';
import WorkoutRestTimer from './WorkoutRestTimer';

const MinimizedWorkoutBar: React.FC = () => {
    const { activeWorkout, maximizeWorkout } = useContext(AppContext);
    const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);

    if (!activeWorkout) return null;

    return (
        <div className="bg-primary shadow-lg w-full">
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
