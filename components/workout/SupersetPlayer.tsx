
import React, { useState, useEffect, useRef, useContext } from 'react';
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
    onClose: () => void;
}

type Phase = 'work' | 'transition' | 'finished';

const SupersetPlayer: React.FC<SupersetPlayerProps> = ({
    supersetId,
    supersetName,
    exercises,
    onUpdateExercise,
    onClose
}) => {
    const { t } = useI18n();
    const { getExerciseById, history: allHistory } = useContext(AppContext);
    const { displayWeight, getStoredWeight, weightUnit } = useMeasureUnit();
    useWakeLock(true);

    // Calculate starting position based on first incomplete set across exercises
    const calculateStartIndex = () => {
        let minSets = 999;
        exercises.forEach(ex => {
            const completedCount = ex.sets.filter(s => s.isComplete).length;
            if (completedCount < minSets) minSets = completedCount;
        });
        return minSets; // e.g. if everyone has done 1 set, start at index 1 (Round 2)
    };

    const [currentRoundIndex, setCurrentRoundIndex] = useState(calculateStartIndex());
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>('work');
    const [timeLeft, setTimeLeft] = useState(10); // 10s Transition
    
    // Input state for the active set
    const [weightInput, setWeightInput] = useState('');
    const [repsInput, setRepsInput] = useState('');

    const intervalRef = useRef<number | null>(null);

    // Derived state
    const currentWorkoutExercise = exercises[currentExerciseIndex];
    const currentExerciseInfo = getExerciseById(currentWorkoutExercise.exerciseId);
    const nextExerciseIndex = (currentExerciseIndex + 1) % exercises.length;
    const nextWorkoutExercise = exercises[nextExerciseIndex];
    const nextExerciseInfo = getExerciseById(nextWorkoutExercise.exerciseId);

    const totalRounds = Math.max(...exercises.map(ex => ex.sets.length));
    const roundsLeft = Math.max(0, totalRounds - (currentRoundIndex + 1));

    // Ensure set exists for current round
    useEffect(() => {
        if (phase !== 'work') return;
        
        const ensureSetExists = () => {
            // Check if set exists at this index
            if (!currentWorkoutExercise.sets[currentRoundIndex]) {
                // Try to inherit from previous set of THIS exercise
                const prevSet = currentWorkoutExercise.sets[currentRoundIndex - 1];
                // Or fallback to last existing set (which might be the same if index is 0 and logic is weird, but usually safe)
                const lastSet = currentWorkoutExercise.sets[currentWorkoutExercise.sets.length - 1] || { reps: 10, weight: 0, type: 'normal' };
                
                const newSet: PerformedSet = {
                    id: `set-${Date.now()}-${Math.random()}`,
                    reps: prevSet ? prevSet.reps : lastSet.reps,
                    weight: prevSet ? prevSet.weight : lastSet.weight,
                    time: prevSet ? prevSet.time : lastSet.time,
                    type: lastSet.type,
                    isComplete: false,
                    isRepsInherited: true,
                    isWeightInherited: true,
                    isTimeInherited: true,
                };
                const updatedSets = [...currentWorkoutExercise.sets];
                updatedSets[currentRoundIndex] = newSet; // Ensure it's at the right index, filling gaps if necessary (though uncommon here)
                
                onUpdateExercise({ ...currentWorkoutExercise, sets: updatedSets });
            }
        };

        ensureSetExists();
    }, [currentRoundIndex, currentExerciseIndex, phase, currentWorkoutExercise, onUpdateExercise]);


    // Load values into inputs when entering work phase or changing exercise
    useEffect(() => {
        if (phase === 'work') {
            const set = currentWorkoutExercise.sets[currentRoundIndex];
            const prevSet = currentWorkoutExercise.sets[currentRoundIndex - 1];

            if (set) {
                let initialWeight = set.weight;
                let initialReps = set.reps;
                let initialTime = set.time;

                // Inheritance Logic:
                // If the current set is incomplete, we prioritize values from the immediately preceding set 
                // of the same exercise (if available) over the values currently in the set object (which might be old template data or 0).
                // This ensures that if user did 50kg in Set 1, Set 2 defaults to 50kg even if template said 0.
                if (!set.isComplete && prevSet) {
                    if (prevSet.weight > 0) initialWeight = prevSet.weight;
                    if (prevSet.reps > 0) initialReps = prevSet.reps;
                    if (prevSet.time && prevSet.time > 0) initialTime = prevSet.time;
                }

                if (set.type === 'timed') {
                    setWeightInput((initialTime || 0).toString());
                } else {
                    setWeightInput(initialWeight > 0 ? displayWeight(initialWeight) : '');
                }
                setRepsInput(initialReps > 0 ? initialReps.toString() : '');
            }
        }
    }, [currentWorkoutExercise, currentRoundIndex, phase, displayWeight]);

    // Timer Logic
    useEffect(() => {
        if (phase === 'transition') {
            unlockAudioContext();
            intervalRef.current = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTransitionComplete();
                        return 0;
                    }
                    if (prev <= 4) playTickSound();
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [phase]);

    const handleTransitionComplete = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // Move to next
        const isLastExerciseInRound = currentExerciseIndex === exercises.length - 1;
        if (isLastExerciseInRound) {
            setCurrentRoundIndex(prev => prev + 1);
            setCurrentExerciseIndex(0);
        } else {
            setCurrentExerciseIndex(prev => prev + 1);
        }
        setPhase('work');
    };

    const handleCompleteSet = () => {
        const set = currentWorkoutExercise.sets[currentRoundIndex];
        if (!set) return;

        const val1 = parseFloat(weightInput) || 0;
        const val2 = parseFloat(repsInput) || 0;

        const updatedSet: PerformedSet = {
            ...set,
            isComplete: true,
            // If timed, weightInput maps to time, repsInput to reps
            weight: set.type === 'timed' ? 0 : getStoredWeight(val1),
            time: set.type === 'timed' ? val1 : set.time,
            reps: val2,
            isWeightInherited: false,
            isRepsInherited: false,
        };

        const newSets = [...currentWorkoutExercise.sets];
        newSets[currentRoundIndex] = updatedSet;
        onUpdateExercise({ ...currentWorkoutExercise, sets: newSets });

        // Start transition
        setTimeLeft(10); // Reset timer
        setPhase('transition');
    };

    const adjustValue = (setter: React.Dispatch<React.SetStateAction<string>>, value: string, delta: number) => {
        const current = parseFloat(value) || 0;
        const decimals = (delta % 1 !== 0) ? 1 : 0;
        setter((Math.max(0, current + delta)).toFixed(decimals));
    };

    if (!currentExerciseInfo) return null;

    const currentSet = currentWorkoutExercise.sets[currentRoundIndex] || { type: 'normal' };
    const isTimed = currentSet.type === 'timed';
    
    // Get previous data for ghost text
    const prevHistory = getExerciseHistory(allHistory, currentWorkoutExercise.exerciseId);
    const lastPerformance = prevHistory.length > 0 ? prevHistory[0].exerciseData.sets[currentRoundIndex] : null;

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start p-4 bg-surface border-b border-white/10 relative">
                <div className="flex flex-col">
                    <span className="text-2xl font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        ROUND {currentRoundIndex + 1} OF {totalRounds} <span className="text-sm font-bold text-indigo-400/60 mt-1">({roundsLeft} LEFT)</span>
                    </span>
                    <span className="text-sm text-text-secondary font-medium mt-0.5">
                         {currentExerciseInfo.name} ({currentExerciseIndex + 1} / {exercises.length})
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
                            <p className="text-yellow-400 font-bold text-xl mb-2 uppercase tracking-widest">Rest & Switch</p>
                            <div className="text-8xl font-mono font-bold text-white mb-2">{timeLeft}</div>
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                                <div 
                                    className="h-full bg-yellow-400 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-surface p-6 rounded-2xl border border-white/10 w-full max-w-sm mb-8">
                            <p className="text-text-secondary text-sm mb-1 text-center uppercase font-bold">Next Up</p>
                            <p className="text-2xl font-bold text-white text-center">{nextExerciseInfo?.name}</p>
                        </div>

                        <div className="flex gap-4 w-full max-w-sm">
                            <button 
                                onClick={() => setTimeLeft(prev => prev + 10)}
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
                    </div>
                ) : (
                    // WORK VIEW
                    <div className="flex flex-col h-full p-4 sm:p-6 animate-fadeIn">
                         <div className="text-center mb-4">
                            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight mb-2">{currentExerciseInfo.name}</h2>
                            <div className="flex items-center justify-center gap-2">
                                <span className="bg-surface-highlight px-3 py-1 rounded-full text-xs font-bold uppercase text-text-secondary">
                                    Round {currentRoundIndex + 1}
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
