
import React, { useContext, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { TimerContext } from '../../contexts/TimerContext';
import { Routine, WorkoutExercise } from '../../types';
import { Icon } from '../common/Icon';
import OneRepMaxHub from '../onerepmax/OneRepMaxHub';

interface QuickTrainingSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

const QuickTrainingSection: React.FC<QuickTrainingSectionProps> = ({ isOpen, onToggle }) => {
    const { t } = useI18n();
    const { startQuickTimer, startHiitSession } = useContext(TimerContext);
    const [isOrmHubOpen, setIsOrmHubOpen] = useState(false);

    const quickTimeOptions = [
        { label: `5 ${t('timers_minute_abbreviation')}`, value: 300 },
        { label: `10 ${t('timers_minute_abbreviation')}`, value: 600 },
        { label: `15 ${t('timers_minute_abbreviation')}`, value: 900 },
    ];
    
    const quickHiitWork = 30;
    const quickHiitRest = 15;
    const quickHiitRounds = 10;
    const quickHiitPrepare = 10;
    const quickHiitTotalSeconds = quickHiitPrepare + (quickHiitWork * quickHiitRounds) + (quickHiitRest * (quickHiitRounds - 1));
    const quickHiitTotalMinutes = Math.round(quickHiitTotalSeconds / 60);

    const handleStartQuickTimer = (seconds: number) => {
        startQuickTimer(seconds);
        window.location.hash = '/timers';
    };

    const handleStartQuickHiit = () => {
        const quickHiitRoutine: Routine = {
            id: `quick-hiit-${Date.now()}`,
            name: t('train_quick_hiit_name', { time: quickHiitTotalMinutes }),
            description: t('train_quick_hiit_desc', { work: quickHiitWork, rest: quickHiitRest, rounds: quickHiitRounds }),
            isTemplate: true,
            routineType: 'hiit',
            hiitConfig: {
                workTime: quickHiitWork,
                restTime: quickHiitRest,
                prepareTime: quickHiitPrepare,
            },
            exercises: Array.from({ length: quickHiitRounds }, (_, i): WorkoutExercise => ({
                id: `we-quick-hiit-${i}`,
                exerciseId: `Round ${i + 1}`,
                sets: [],
                restTime: { normal: 0, warmup: 0, drop: 0, timed: 0, effort: 0, failure: 0 },
            }))
        };
        startHiitSession(quickHiitRoutine);
        window.location.hash = '/timers';
    };

    return (
        <div>
            <div className="w-full flex justify-between items-center text-left py-2">
                 <button
                    onClick={onToggle}
                    className="flex-grow flex items-center space-x-2 text-left"
                >
                    <h2 className="text-xl font-semibold">{t('train_quick_training')}</h2>
                    <Icon name="arrow-right" className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
            </div>
            {isOpen && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    {quickTimeOptions.map(opt => (
                        <button key={opt.value} onClick={() => handleStartQuickTimer(opt.value)} className="bg-surface hover:bg-slate-700 text-text-primary font-bold py-4 rounded-lg text-lg transition-colors">
                            {opt.label}
                        </button>
                    ))}
                    <button onClick={handleStartQuickHiit} className="bg-surface hover:bg-slate-700 text-text-primary font-bold py-3 px-2 rounded-lg text-lg transition-colors flex flex-col items-center justify-center">
                        <span>{t('train_quick_hiit_label', { time: quickHiitTotalMinutes })}</span>
                        <span className="text-xs font-normal text-text-secondary">{t('train_quick_hiit_desc_short')}</span>
                    </button>
                    <button onClick={() => setIsOrmHubOpen(true)} className="bg-surface hover:bg-slate-700 text-indigo-300 font-bold py-3 px-2 rounded-lg text-lg transition-colors flex flex-col items-center justify-center border border-indigo-500/30">
                        <Icon name="weight" className="w-6 h-6 mb-1" />
                        <span className="text-sm">{t('orm_title')}</span>
                    </button>
                </div>
            )}
            <OneRepMaxHub isOpen={isOrmHubOpen} onClose={() => setIsOrmHubOpen(false)} />
        </div>
    );
};

export default QuickTrainingSection;
