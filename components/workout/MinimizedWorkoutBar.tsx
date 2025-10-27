import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { Icon } from '../common/Icon';

const MinimizedWorkoutBar: React.FC = () => {
    const { activeWorkout, maximizeWorkout } = useContext(AppContext);
    const elapsedTime = useWorkoutTimer(activeWorkout?.startTime);

    if (!activeWorkout) return null;

    return (
        <button
            onClick={maximizeWorkout}
            className="fixed bottom-16 left-0 right-0 h-14 bg-primary text-white flex items-center justify-between px-4 z-40 shadow-lg w-full transition-transform hover:scale-[1.02]"
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
    );
};

export default MinimizedWorkoutBar;
