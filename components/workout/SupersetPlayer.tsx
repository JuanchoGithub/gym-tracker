
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { WorkoutExercise, PerformedSet, Exercise } from '../../types';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { useMeasureUnit } from '../../hooks/useWeight';
import { useWakeLock } from '../../hooks/useWakeLock';
import { playTickSound, playWarningSound, unlockAudioContext } from '../../services/audioService';
import { getExerciseHistory } from '../../utils/workoutUtils';
import { TranslationKey } from '../../contexts/I18nContext';

interface SupersetPlayerProps {
    supersetId: string;
    supersetName: string;
    exercises: WorkoutExercise[];
    onUpdateExercise: (updatedExercise: WorkoutExercise) => void;
    onUpdateExercises?: (updatedExercises: WorkoutExercise[]) => void;
    onClose: () => void;
}

type Phase = 'work' | 'transition' | 'finished';

const SupersetPlayer: React.FC<SupersetPlayerProps> = ({
    supersetId,
    supersetName,
    exercises,
    onUpdateExercise,
    onUpdateExercises,
    onClose
}) => {
    const { t } = useI18n();
    const { getExerciseById, history: allHistory } = useContext(AppContext);
    const { displayWeight, getStoredWeight, weightUnit } = useMeasureUnit();
    useWakeLock(true);

    // Calculate total rounds dynamically from current props
    const totalRoundsCurrent = useMemo(() => {
        if (!exercises || exercises.length === 0) return 1;
        return Math.max(...exercises.map(ex => ex.sets.length));
    }, [exercises]);

    // Calculate starting position based on first incomplete set across exercises
    const [startIndex] = useState(() => {
        let minSets = 999;
        if (!exercises || exercises.length === 0) return 0;
        exercises.forEach(ex => {
            const completedCount = ex.sets.filter(s => s.isComplete).length;
            if (completedCount < minSets) minSets = completedCount;
        });
        return minSets === 999 ? 0 : minSets; 
    });

    const [currentRoundIndex, setCurrentRoundIndex] = useState(startIndex);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>('work');
    const [timeLeft, setTimeLeft] = useState(10);
    
    const [weightInput, setWeightInput] = useState('');
    const [repsInput, setRepsInput] = useState('');

    const intervalRef = useRef<number | null>(null);
    const targetTimeRef = useRef<number>(0);

    const currentWorkoutExercise = exercises[currentExerciseIndex];
    const currentExerciseInfo = currentWorkoutExercise ? getExerciseById(currentWorkoutExercise.exerciseId) : null;
    
    const isLastExerciseOfLoop = currentExerciseIndex === exercises.length - 1;
    const isLastRoundOfLoop = currentRoundIndex === totalRoundsCurrent - 1;
    const isFinalRest = phase === 'transition' && isLastExerciseOfLoop && isLastRoundOfLoop;

    const nextExerciseIndex = (currentExerciseIndex + 1) % exercises.length;
    const nextWorkoutExercise = exercises[nextExerciseIndex];
    const nextExerciseInfo = nextWorkoutExercise ? getExerciseById(nextWorkoutExercise.exerciseId) : null;
    
    const nextRoundIndex = isLastExerciseOfLoop ? currentRoundIndex + 1 : currentRoundIndex;

    // Fix for Uneven Sets: Auto-generate set if missing for current round
    useEffect(() => {
        if (currentWorkoutExercise && !currentWorkoutExercise.sets[currentRoundIndex]) {
             const lastSet = currentWorkoutExercise.sets[currentWorkoutExercise.sets.length - 1];
             const newSet: PerformedSet = {
                id: `set-${Date.now()}-${Math.random()}`,
                reps: lastSet ? lastSet.reps : 10,
                weight: lastSet ? lastSet.weight : 0,
                time: lastSet?.time,
                type: lastSet ? lastSet.type : 'normal',
                isComplete: false,
                isRepsInherited: true,
                isWeightInherited: true,
                isTimeInherited: true,
            };
            
            const newSets = [...currentWorkoutExercise.sets];
            newSets[currentRoundIndex] = newSet;
            
            onUpdateExercise({ ...currentWorkoutExercise, sets: newSets });
        }
    }, [currentWorkoutExercise, currentRoundIndex, onUpdateExercise]);

    const getRoundDisplayString = (roundIdx: number) => `ROUND ${roundIdx + 1} OF ${Math.max(totalRoundsCurrent, roundIdx + 1)}`;
    const getShortRoundDisplayString = (roundIdx: number) => `(Round ${roundIdx + 1} of ${Math.max(totalRoundsCurrent, roundIdx + 1)})`;

    // Safe access to current set
    const currentSet = currentWorkoutExercise?.sets ? currentWorkoutExercise.sets[currentRoundIndex] : undefined;

    // Load values into inputs
    useEffect(() => {
        if (phase === 'work' && currentSet) {
            const prevSet = currentRoundIndex > 0 ? currentWorkoutExercise.sets[currentRoundIndex - 1] : undefined;

            let initialWeight = currentSet.weight;
            let initialReps = currentSet.reps;
            let initialTime = currentSet.time;

            if (!currentSet.isComplete && prevSet) {
                if (prevSet.weight > 0) initialWeight = prevSet.weight;
                if (prevSet.reps > 0) initialReps = prevSet.reps;
                if (prevSet.time && prevSet.time > 0) initialTime = prevSet.time;
            }

            if (currentSet.type === 'timed') {
                setWeightInput((initialTime || 0).toString());
            } else {
                setWeightInput(initialWeight > 0 ? displayWeight(initialWeight) : '');
            }
            setRepsInput(initialReps > 0 ? initialReps.toString() : '');
        }
    }, [currentSet, currentWorkoutExercise, currentRoundIndex, phase, displayWeight]);

    // Timer Logic
    useEffect(() => {
        if (phase === 'transition') {
            targetTimeRef.current = Date.now() + 10000;

            intervalRef.current = window.setInterval(() => {
                const now = Date.now();
                const remaining = Math.ceil((targetTimeRef.current - now) / 1000);
                
                setTimeLeft((prev) => {
                    if (remaining <= 0) {
                         if (isFinalRest) {
                            if (intervalRef.current) clearInterval(intervalRef.current);
                            return 0;
                        }
                        handleTransitionComplete();
                        return 0;
                    }
                    if (remaining <= 4 && remaining < prev) playTickSound();
                    return remaining;
                });
            }, 200);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [phase, isFinalRest]);

    const handleAddTime = () => {
        unlockAudioContext();
        targetTimeRef.current += 10000;
        setTimeLeft(prev => prev + 10);
    };

    const handleTransitionComplete = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // If we are moving to a new round, ensure the data exists first
        if (isLastExerciseOfLoop) {
            const nextR = currentRoundIndex + 1;
            const nextE = 0;
            
            // Verify if set exists for next round on the first exercise
            if (exercises[nextE] && (!exercises[nextE].sets || !exercises[nextE].sets[nextR])) {
                // Create it immediately
                const ex = exercises[nextE];
                const lastSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : undefined;
                const newSet: PerformedSet = {
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps: lastSet ? lastSet.reps : 10,
                    weight: lastSet ? lastSet.weight : 0,
                    time: lastSet?.time,
                    type: lastSet ? lastSet.type : 'normal',
                    isComplete: false,
                    isRepsInherited: true,
                    isWeightInherited: true,
                    isTimeInherited: true,
                };
                // Critical: update data before changing index
                const updatedSets = [...ex.sets, newSet];
                onUpdateExercise({ ...ex, sets: updatedSets });
            }
            setCurrentRoundIndex(nextR);
            setCurrentExerciseIndex(nextE);
        } else {
            setCurrentExerciseIndex(prev => prev + 1);
        }
        setPhase('work');
    };

    const handleCompleteSet = () => {
        unlockAudioContext();
        const set = currentWorkoutExercise?.sets ? currentWorkoutExercise.sets[currentRoundIndex] : undefined;
        if (!set) return;

        const val1 = parseFloat(weightInput) || 0;
        const val2 = parseFloat(repsInput) || 0;

        const updatedSet: PerformedSet = {
            ...set,
            isComplete: true,
            completedAt: Date.now(),
            weight: set.type === 'timed' ? 0 : getStoredWeight(val1),
            time: set.type === 'timed' ? val1 : set.time,
            reps: val2,
            isWeightInherited: false,
            isRepsInherited: false,
        };

        const newSets = [...currentWorkoutExercise.sets];
        newSets[currentRoundIndex] = updatedSet;
        onUpdateExercise({ ...currentWorkoutExercise, sets: newSets });

        setTimeLeft(10); 
        setPhase('transition');
    };

    const handleOneMoar = () => {
        unlockAudioContext();
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        const nextR = currentRoundIndex + 1;
        
        // Pre-populate the next round sets for ALL exercises in the superset to avoid race conditions
        const updatedExercises = exercises.map(ex => {
             if (!ex.sets[nextR]) {
                 const lastSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : undefined;
                 const newSet: PerformedSet = {
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps: lastSet ? lastSet.reps : 10,
                    weight: lastSet ? lastSet.weight : 0,
                    time: lastSet?.time,
                    type: lastSet ? lastSet.type : 'normal',
                    isComplete: false,
                    isRepsInherited: true,
                    isWeightInherited: true,
                    isTimeInherited: true,
                };
                return { ...ex, sets: [...ex.sets, newSet] };
             }
             return ex;
        });

        if (onUpdateExercises) {
            onUpdateExercises(updatedExercises);
        } else {
            // Fallback loop if bulk update not available
            updatedExercises.forEach(ex => onUpdateExercise(ex));
        }

        // Now safe to advance pointers
        setCurrentRoundIndex(nextR);
        setCurrentExerciseIndex(0);
        setPhase('work');
    };

    const adjustValue = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, delta: number) => {
        const current = parseFloat(value) || 0;
        const decimals = (delta % 1 !== 0) ? 1 : 0;
        setter((Math.max(0, current + delta)).toFixed(decimals));
    };

    if (!currentExerciseInfo || !currentSet) {
        return (
            <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
                 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-text-secondary">Preparing Round...</p>
            </div>
        );
    }

    const isTimed = currentSet.type === 'timed';
    const prevHistory = getExerciseHistory(allHistory, currentWorkoutExercise.exerciseId);
    const lastPerformance = prevHistory.length > 0 ? prevHistory[0].exerciseData.sets[currentRoundIndex] : null;

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center p-4 bg-surface border-b border-white/10 relative">
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        {getRoundDisplayString(currentRoundIndex)}
                    </span>
                    <span className="text-sm text-text-secondary font-medium mt-0.5">
                        {phase === 'work' 
                            ? `${currentExerciseInfo.name} (${currentExerciseIndex + 1} / ${exercises.length})`
                            : (isFinalRest ? 'Superset Finished' : 'Rest & Switch')
                        }
                    </span>
                </div>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 absolute right-4 top-4">
                    <Icon name="x" className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-grow flex flex-col relative overflow-hidden">
                {phase === 'transition' ? (
                    // TRANSITION VIEW
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-indigo-900/20 animate-fadeIn">
                        <div className="text-center mb-8">
                            <p className="text-yellow-400 font-bold text-xl mb-2 uppercase tracking-widest">
                                {isFinalRest ? 'Superset Complete!' : 'Rest & Switch'}
                            </p>
                            <div className={`font-mono font-bold text-white mb-2 ${isFinalRest ? 'text-6xl' : 'text-8xl'}`}>
                                {isFinalRest ? <Icon name="check" className="w-24 h-24 mx-auto text-success" /> : timeLeft}
                            </div>
                            {!isFinalRest && (
                                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                                    <div 
                                        className="h-full bg-yellow-400 transition-all duration-200 linear"
                                        style={{ width: `${(timeLeft / 10) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="bg-surface p-6 rounded-2xl border border-white/10 w-full max-w-sm mb-8">
                            {isFinalRest ? (
                                <div className="text-center">
                                    <p className="text-text-secondary text-sm mb-1 uppercase font-bold">Good Job!</p>
                                    <p className="text-xl font-bold text-white">All rounds completed.</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-text-secondary text-sm mb-1 uppercase font-bold">Next Up</p>
                                    <p className="text-2xl font-bold text-white">{nextExerciseInfo?.name}</p>
                                    <p className="text-indigo-300 text-sm font-bold mt-1">{getShortRoundDisplayString(nextRoundIndex)}</p>
                                </div>
                            )}
                        </div>

                        {isFinalRest ? (
                            <div className="flex gap-4 w-full max-w-sm flex-col sm:flex-row">
                                <button 
                                    onClick={onClose}
                                    className="flex-1 bg-surface border border-white/10 py-4 rounded-xl font-bold text-text-primary active:scale-95 transition-transform"
                                >
                                    Finish
                                </button>
                                <button 
                                    onClick={handleOneMoar}
                                    className="flex-[2] bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                    <Icon name="plus" className="w-5 h-5" />
                                    DO ONE MOAR!
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-4 w-full max-w-sm">
                                <button 
                                    onClick={handleAddTime}
                                    className="flex-1 bg-surface border border-white/10 py-4 rounded-xl font-bold text-text-primary active:scale-95 transition-transform"
                                >
                                    +10s
                                </button>
                                <button 
                                    onClick={handleTransitionComplete}
                                    className="flex-[2] bg-primary text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-primary/20"
                                >
                                    Start Now
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // WORK VIEW
                    <div className="flex flex-col h-full p-4 sm:p-6 animate-fadeIn">
                         <div className="text-center mb-4">
                            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight mb-2">{currentExerciseInfo.name}</h2>
                            <div className="flex items-center justify-center gap-2">
                                <span className="bg-surface-highlight px-3 py-1 rounded-full text-xs font-bold text-text-secondary">
                                    {getShortRoundDisplayString(currentRoundIndex)}
                                </span>
                                {currentSet.type !== 'normal' && (
                                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                        {t(`set_type_${currentSet.type}` as TranslationKey)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
                            <div className="bg-surface/30 p-6 rounded-3xl border border-white/5 space-y-8 relative">
                                 {/* Input 1: Weight or Time */}
                                 <div>
                                     <label className="block text-center text-xs text-text-secondary font-bold uppercase mb-2 tracking-wide">
                                         {isTimed ? t('workout_time') : t('workout_weight')} <span className="opacity-50 normal-case">({isTimed ? 's' : t(`workout_${weightUnit}` as TranslationKey)})</span>
                                     </label>
                                     <div className="flex items-center justify-center gap-4 bg-black/20 rounded-2xl p-3">
                                         <button onClick={() => adjustValue(setWeightInput, weightInput, isTimed ? -5 : -2.5)} className="w-14 h-14 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl font-bold text-text-secondary transition-colors pb-1">-</button>
                                         <input 
                                             type="number" 
                                             value={weightInput}
                                             onChange={(e) => setWeightInput(e.target.value)}
                                             onFocus={(e) => e.target.select()}
                                             className="w-32 sm:w-40 bg-transparent text-center text-5xl sm:text-6xl font-bold text-white outline-none font-mono"
                                             placeholder={lastPerformance ? (isTimed ? lastPerformance.time?.toString() : displayWeight(lastPerformance.weight)) : '-'}
                                         />
                                         <button onClick={() => adjustValue(setWeightInput, weightInput, isTimed ? 5 : 2.5)} className="w-14 h-14 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl font-bold text-primary transition-colors pb-1">+</button>
                                     </div>
                                 </div>

                                 {/* Input 2: Reps */}
                                 <div>
                                     <label className="block text-center text-xs text-text-secondary font-bold uppercase mb-2 tracking-wide">
                                         {t('workout_reps')}
                                     </label>
                                     <div className="flex items-center justify-center gap-4 bg-black/20 rounded-2xl p-3">
                                         <button onClick={() => adjustValue(setRepsInput, repsInput, -1)} className="w-14 h-14 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl font-bold text-text-secondary transition-colors pb-1">-</button>
                                         <input 
                                             type="number" 
                                             value={repsInput}
                                             onChange={(e) => setRepsInput(e.target.value)}
                                             onFocus={(e) => e.target.select()}
                                             className="w-32 sm:w-40 bg-transparent text-center text-5xl sm:text-6xl font-bold text-white outline-none font-mono"
                                             placeholder={lastPerformance ? lastPerformance.reps.toString() : '-'}
                                         />
                                         <button onClick={() => adjustValue(setRepsInput, repsInput, 1)} className="w-14 h-14 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl font-bold text-primary transition-colors pb-1">+</button>
                                     </div>
                                 </div>
                            </div>
                            
                             {/* Last Performance Hint */}
                             {lastPerformance && (
                                <div className="text-center text-xs text-text-secondary/50 mt-4 font-mono">
                                    Last: {isTimed ? `${lastPerformance.time}s` : displayWeight(lastPerformance.weight)} x {lastPerformance.reps}
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-4">
                            <button 
                                onClick={handleCompleteSet}
                                className="w-full bg-success hover:bg-green-500 text-white font-bold text-lg py-5 rounded-2xl shadow-lg shadow-success/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <Icon name="check" className="w-6 h-6" />
                                <span>{t('workout_finish')} Set</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupersetPlayer;
