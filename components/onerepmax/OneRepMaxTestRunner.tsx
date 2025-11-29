
import React, { useState, useEffect, useContext } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { AppContext } from '../../contexts/AppContext';
import { formatSecondsToMMSS, lockBodyScroll, unlockBodyScroll } from '../../utils/timeUtils';
import { Icon } from '../common/Icon';
import { TranslationKey } from '../../contexts/I18nContext';

interface OneRepMaxTestRunnerProps {
    isOpen: boolean;
    onClose: () => void;
    exerciseId: string;
    targetMax: number; // The goal for today (usually current e1RM)
    onComplete: (newMax: number) => void;
}

type TestPhase = 'safety' | 'warmup_1' | 'warmup_2' | 'warmup_3' | 'acclimation' | 'attempt' | 'result';

const OneRepMaxTestRunner: React.FC<OneRepMaxTestRunnerProps> = ({ isOpen, onClose, exerciseId, targetMax, onComplete }) => {
    const { t } = useI18n();
    const { displayWeight, weightUnit, getStoredWeight } = useMeasureUnit();
    const { getExerciseById } = useContext(AppContext);
    
    const [phase, setPhase] = useState<TestPhase>('safety');
    const [restTimer, setRestTimer] = useState<number | null>(null);
    const [currentWeight, setCurrentWeight] = useState(0);
    const [attemptWeight, setAttemptWeight] = useState(targetMax);
    
    const exercise = getExerciseById(exerciseId);

    useEffect(() => {
        if (isOpen) {
            lockBodyScroll();
            setPhase('safety');
        } else {
            unlockBodyScroll();
        }
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        let interval: number;
        if (restTimer !== null && restTimer > 0) {
            interval = window.setInterval(() => {
                setRestTimer(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [restTimer]);

    if (!exercise) return null;

    const nextPhase = () => {
        setRestTimer(null);
        switch (phase) {
            case 'safety': setPhase('warmup_1'); break;
            case 'warmup_1': setPhase('warmup_2'); break;
            case 'warmup_2': setPhase('warmup_3'); break;
            case 'warmup_3': setPhase('acclimation'); break;
            case 'acclimation': setPhase('attempt'); break;
            case 'attempt': setPhase('result'); break;
            case 'result': onClose(); break;
        }
    };

    const startRest = (seconds: number) => {
        setRestTimer(seconds);
    };

    const renderContent = () => {
        if (restTimer !== null) {
            return (
                <div className="text-center py-10 animate-fadeIn">
                    <p className="text-text-secondary text-lg mb-2">{t('orm_prof_rest')}</p>
                    <div className="text-7xl font-mono font-bold text-white mb-8">{formatSecondsToMMSS(restTimer)}</div>
                    <button onClick={() => { setRestTimer(null); nextPhase(); }} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-xl transition-colors">
                        {t('orm_prof_skip_rest')}
                    </button>
                </div>
            );
        }

        switch (phase) {
            case 'safety':
                return (
                    <div className="space-y-6 py-4 animate-fadeIn">
                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                            <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
                                <Icon name="warning" className="w-5 h-5" />
                                {t('orm_prof_safety_title')}
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-white/5 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                <span className="text-white">{t('orm_prof_safety_q1')}</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-white/5 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                <span className="text-white">{t('orm_prof_safety_q2')}</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={onClose} className="flex-1 bg-surface hover:bg-white/5 text-text-secondary font-bold py-4 rounded-xl transition-colors">
                                {t('orm_prof_cancel')}
                            </button>
                            <button onClick={nextPhase} className="flex-[2] bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20">
                                {t('orm_prof_start')}
                            </button>
                        </div>
                    </div>
                );

            case 'warmup_1':
            case 'warmup_2':
            case 'warmup_3':
            case 'acclimation':
                let titleKey = '', actionTemplate = '', whyKey = '';
                let percentage = 0;
                let restTime = 60;

                if (phase === 'warmup_1') {
                    titleKey = 'orm_step_1_title';
                    actionTemplate = 'orm_step_1_action'; // "Empty Bar"
                    whyKey = 'orm_step_1_why';
                    percentage = 0; // Usually empty bar (20kg or 45lbs)
                } else if (phase === 'warmup_2') {
                    titleKey = 'orm_step_2_title';
                    actionTemplate = 'orm_step_2_action';
                    whyKey = 'orm_step_2_why';
                    percentage = 0.5;
                    restTime = 90;
                } else if (phase === 'warmup_3') {
                    titleKey = 'orm_step_3_title';
                    actionTemplate = 'orm_step_3_action';
                    whyKey = 'orm_step_3_why';
                    percentage = 0.75;
                    restTime = 120;
                } else if (phase === 'acclimation') {
                    titleKey = 'orm_step_4_title';
                    actionTemplate = 'orm_step_4_action';
                    whyKey = 'orm_step_4_why';
                    percentage = 0.9;
                    restTime = 180;
                }

                const load = Math.max(20, Math.round(targetMax * percentage / 2.5) * 2.5);
                // For warmup 1, if it's barbell, we assume empty bar ~20kg. If dumbbell, maybe light weight.
                // Simplified: if phase 1, use "Empty Bar" text if translation handles it, else calc.
                const displayLoad = phase === 'warmup_1' && exercise.category === 'Barbell' 
                    ? t('bar_type') 
                    : `${displayWeight(load)} ${t(('workout_' + weightUnit) as TranslationKey)}`;
                
                const actionText = t(actionTemplate as TranslationKey).replace('{weight}', displayLoad);

                return (
                    <div className="space-y-6 py-4 animate-fadeIn">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-white uppercase tracking-wide mb-2">{t(titleKey as TranslationKey)}</h2>
                            <div className="bg-surface border border-white/10 rounded-2xl p-6 mb-6">
                                <p className="text-4xl font-bold text-primary">{actionText}</p>
                            </div>
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-left">
                                <div className="flex items-start gap-3">
                                    <div className="bg-indigo-500/20 p-2 rounded-full flex-shrink-0">
                                        <Icon name="sparkles" className="w-5 h-5 text-indigo-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Coach's Note</p>
                                        <p className="text-indigo-100 text-sm leading-relaxed">{t(whyKey as TranslationKey)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => startRest(restTime)} className="w-full bg-white text-background font-bold py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-colors">
                            Done
                        </button>
                    </div>
                );

            case 'attempt':
                return (
                    <div className="space-y-6 py-4 animate-fadeIn">
                         <div className="text-center">
                            <h2 className="text-3xl font-black text-white uppercase tracking-wide mb-2">{t('orm_step_5_title')}</h2>
                             <div className="bg-surface border border-primary/50 rounded-2xl p-6 mb-6 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <input 
                                        type="number" 
                                        value={displayWeight(attemptWeight)} 
                                        onChange={(e) => setAttemptWeight(getStoredWeight(parseFloat(e.target.value)))}
                                        className="bg-transparent text-5xl font-bold text-white text-center w-40 outline-none border-b border-white/20 focus:border-primary"
                                    />
                                    <span className="text-xl text-text-secondary">{t(('workout_' + weightUnit) as TranslationKey)}</span>
                                </div>
                                <p className="text-text-secondary">{t('orm_step_5_action', { weight: '' }).replace('  ', ' ')}</p>
                            </div>
                            <p className="text-text-secondary italic mb-8">"{t('orm_step_5_why')}"</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => {
                                        // Fail logic: lower weight by 5%
                                        setAttemptWeight(prev => Math.round(prev * 0.95 / 2.5) * 2.5);
                                        startRest(180); // Rest 3 mins before retry
                                    }} 
                                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold py-4 rounded-xl"
                                >
                                    {t('orm_wizard_fail')}
                                </button>
                                <button 
                                    onClick={() => {
                                        setCurrentWeight(attemptWeight);
                                        setPhase('result');
                                    }} 
                                    className="bg-success hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/20"
                                >
                                    {t('orm_wizard_success')}
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'result':
                return (
                    <div className="text-center space-y-6 py-8 animate-fadeIn">
                        <div className="inline-block p-6 rounded-full bg-amber-500/20 border border-amber-500/30 mb-2">
                            <Icon name="trophy" className="w-16 h-16 text-amber-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white">{t('orm_result_success_title')}</h2>
                        <p className="text-text-secondary text-lg">
                            {t('orm_result_success_desc', { weight: displayWeight(currentWeight) + ' ' + t(('workout_' + weightUnit) as TranslationKey) })}
                        </p>
                        <button 
                            onClick={() => onComplete(currentWeight)}
                            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg mt-4"
                        >
                            {t('orm_wizard_save')}
                        </button>
                    </div>
                );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={phase !== 'result' ? t('orm_wizard_title') : undefined} contentClassName="bg-[#0f172a] rounded-2xl w-full max-w-md p-6 border border-white/10 h-auto min-h-[400px] flex flex-col">
            <div className="flex-grow flex flex-col justify-center">
                {renderContent()}
            </div>
        </Modal>
    );
};

export default OneRepMaxTestRunner;
