
import React, { useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { SurveyAnswers, generateRoutines } from '../../utils/routineGenerator';
import { Routine } from '../../types';

interface OnboardingWizardProps {
  onComplete: (routines: Routine[]) => void;
  onClose: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onClose }) => {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({
    experience: 'beginner',
    goal: 'muscle',
    equipment: 'gym',
    time: 'medium'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoutines, setGeneratedRoutines] = useState<Routine[]>([]);

  const handleOptionSelect = (key: keyof SurveyAnswers, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      generate();
    }
  };

  const generate = async () => {
    setIsGenerating(true);
    // Simulate a small delay for "thinking" effect
    setTimeout(() => {
      const routines = generateRoutines(answers, t);
      setGeneratedRoutines(routines);
      setIsGenerating(false);
      setStep(4); // Complete step
    }, 1500);
  };

  const handleFinish = () => {
    onComplete(generatedRoutines);
  };

  const steps = [
    {
      question: t('wizard_step_1_question'),
      key: 'experience' as const,
      options: [
        { value: 'beginner', label: t('wizard_option_beginner'), desc: t('wizard_option_beginner_desc'), icon: 'chart-line' },
        { value: 'intermediate', label: t('wizard_option_intermediate'), desc: t('wizard_option_intermediate_desc'), icon: 'dumbbell' },
        { value: 'advanced', label: t('wizard_option_advanced'), desc: t('wizard_option_advanced_desc'), icon: 'trophy' },
      ]
    },
    {
      question: t('wizard_step_2_question'),
      key: 'goal' as const,
      options: [
        { value: 'strength', label: t('wizard_option_strength'), desc: t('wizard_option_strength_desc'), icon: 'weight' },
        { value: 'muscle', label: t('wizard_option_muscle'), desc: t('wizard_option_muscle_desc'), icon: 'dumbbell' },
        { value: 'endurance', label: t('wizard_option_endurance'), desc: t('wizard_option_endurance_desc'), icon: 'stopwatch' },
      ]
    },
    {
      question: t('wizard_step_3_question'),
      key: 'equipment' as const,
      options: [
        { value: 'gym', label: t('wizard_option_gym'), desc: t('wizard_option_gym_desc'), icon: 'dumbbell' },
        { value: 'dumbbell', label: t('wizard_option_dumbbell'), desc: t('wizard_option_dumbbell_desc'), icon: 'weight' },
        { value: 'bodyweight', label: t('wizard_option_bodyweight'), desc: t('wizard_option_bodyweight_desc'), icon: 'user' },
      ]
    },
    {
      question: t('wizard_step_4_question'),
      key: 'time' as const,
      options: [
        { value: 'short', label: t('wizard_option_short'), desc: '< 30 min', icon: 'stopwatch' },
        { value: 'medium', label: t('wizard_option_medium'), desc: '45-60 min', icon: 'history' },
        { value: 'long', label: t('wizard_option_long'), desc: '> 60 min', icon: 'history' },
      ]
    }
  ];

  const currentStepData = steps[step];

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-lg relative">
        {/* Progress Bar */}
        {step < 4 && (
             <div className="absolute top-0 left-0 w-full h-1 bg-surface rounded-full overflow-hidden mb-8">
                <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${((step + 1) / 4) * 100}%` }}
                ></div>
            </div>
        )}
        
        <button onClick={onClose} className="absolute -top-12 right-0 text-text-secondary hover:text-white p-2">
            <Icon name="x" className="w-6 h-6" />
        </button>

        {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold text-white">{t('wizard_generating')}</h2>
            </div>
        ) : step === 4 ? (
            <div className="text-center animate-fadeIn py-10">
                <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon name="check" className="w-10 h-10 text-success" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t('wizard_complete_title')}</h2>
                <p className="text-text-secondary mb-8">{t('wizard_complete_desc', { count: generatedRoutines.length })}</p>
                
                <div className="grid gap-4 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {generatedRoutines.map(routine => (
                        <div key={routine.id} className="bg-surface border border-white/10 p-4 rounded-xl text-left">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-primary text-lg">{routine.name}</h3>
                                <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">{routine.exercises.length} Exercises</span>
                            </div>
                            <p className="text-sm text-text-secondary mt-1 leading-snug">{routine.description}</p>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={handleFinish}
                    className="w-full bg-primary hover:bg-primary-content text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                    {t('wizard_complete_action')}
                </button>
            </div>
        ) : (
            <div className="animate-fadeIn">
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 mt-4">
                    {currentStepData.question}
                </h2>
                
                <div className="space-y-4">
                    {currentStepData.options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleOptionSelect(currentStepData.key, option.value)}
                            className="w-full bg-surface hover:bg-surface-highlight border border-white/5 hover:border-primary/30 p-5 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] group text-left"
                        >
                            <div className="bg-black/20 p-3 rounded-xl group-hover:bg-primary/10 transition-colors">
                                <Icon name={option.icon as any} className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-text-primary group-hover:text-white transition-colors">{option.label}</h3>
                                <p className="text-sm text-text-secondary/70">{option.desc}</p>
                            </div>
                            <div className="ml-auto">
                                <Icon name="arrow-right" className="w-5 h-5 text-text-secondary/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                        </button>
                    ))}
                </div>
                
                {step > 0 && (
                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => setStep(s => s - 1)}
                            className="text-text-secondary hover:text-white text-sm font-medium px-4 py-2"
                        >
                            {t('common_back')}
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
