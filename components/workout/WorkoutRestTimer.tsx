
import React, { useMemo, useCallback, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { ActiveWorkoutContext } from '../../contexts/ActiveWorkoutContext';
import { TimerContext } from '../../contexts/TimerContext';
import Timer from './Timer';

const WorkoutRestTimer: React.FC = () => {
    const { activeWorkout, updateActiveWorkout } = useContext(ActiveWorkoutContext);
    const { activeTimerInfo, setActiveTimerInfo } = useContext(TimerContext);
    
    const activeTimerExercise = useMemo(() => {
        if (!activeTimerInfo || !activeWorkout) return null;
        return activeWorkout.exercises.find(ex => ex.id === activeTimerInfo.exerciseId);
    }, [activeTimerInfo, activeWorkout]);

    const handleTimerFinish = useCallback(() => {
        if (activeWorkout && activeTimerInfo) {
            const elapsedSeconds = activeTimerInfo.totalDuration;

            const updatedExercises = activeWorkout.exercises.map(ex => {
                if (ex.id === activeTimerInfo.exerciseId) {
                    return {
                        ...ex,
                        sets: ex.sets.map(s => s.id === activeTimerInfo.setId ? { ...s, actualRest: elapsedSeconds } : s)
                    };
                }
                return ex;
            });

            updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
            setActiveTimerInfo(null);
        }
    }, [activeWorkout, activeTimerInfo, setActiveTimerInfo, updateActiveWorkout]);
    
    const handleTogglePause = useCallback((isNowPaused: boolean, currentTimerLeft: number) => {
        setActiveTimerInfo(prev => {
            if (!prev) return null;
            if (isNowPaused) {
                return { ...prev, isPaused: true, timeLeftWhenPaused: currentTimerLeft };
            } else {
                // Resuming
                return {
                    ...prev,
                    isPaused: false,
                    targetTime: Date.now() + prev.timeLeftWhenPaused * 1000,
                };
            }
        });
    }, [setActiveTimerInfo]);

    const handleTimeUpdate = useCallback((updates: { newTimeLeft?: number, newTotalDuration?: number }) => {
        setActiveTimerInfo(prev => {
            if (!prev) return null;
            
            const { newTimeLeft, newTotalDuration } = updates;
            const updatedInfo = { ...prev };
            
            if (newTotalDuration !== undefined) {
                updatedInfo.totalDuration = newTotalDuration;
            }

            if (newTimeLeft !== undefined) {
                if (prev.isPaused) {
                    updatedInfo.timeLeftWhenPaused = newTimeLeft;
                } else {
                    updatedInfo.targetTime = Date.now() + newTimeLeft * 1000;
                }
            }
            
            return updatedInfo;
        });
    }, [setActiveTimerInfo]);

    const handleChangeDuration = useCallback((newDuration: number) => {
        setActiveTimerInfo(prev => {
            if (!prev) return null;
    
            // Calculate current timeLeft regardless of pause state
            const currentTimeLeft = prev.isPaused 
                ? prev.timeLeftWhenPaused 
                : Math.max(0, Math.round((prev.targetTime - Date.now()) / 1000));
            
            const elapsedSeconds = prev.totalDuration - currentTimeLeft;
            const newTimeLeft = Math.max(0, newDuration - elapsedSeconds);
    
            return {
                ...prev,
                totalDuration: newDuration,
                isPaused: false, // Always resume/start timer
                targetTime: Date.now() + newTimeLeft * 1000,
                timeLeftWhenPaused: 0, // Clear paused time
            };
        });
    }, [setActiveTimerInfo]);

    if (!activeTimerInfo || !activeTimerExercise) {
        return null;
    }

    return (
        <Timer
            key={activeTimerInfo.setId}
            timerInfo={activeTimerInfo}
            effortTime={activeTimerExercise.restTime.effort}
            failureTime={activeTimerExercise.restTime.failure}
            onFinish={handleTimerFinish}
            onTogglePause={handleTogglePause}
            onTimeUpdate={handleTimeUpdate}
            onChangeDuration={handleChangeDuration}
        />
    );
};

export default WorkoutRestTimer;
