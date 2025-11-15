
import React, { useState, useContext, FormEvent, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useI18n } from '../hooks/useI18n';
import { SupplementInfo } from '../types';
import { generateSupplementPlan } from '../services/supplementService';
import { Icon } from '../components/common/Icon';
import SupplementSchedule from '../components/supplements/SupplementSchedule';
import SupplementReviewModal from '../components/supplements/SupplementReviewModal';
import { useMeasureUnit } from '../hooks/useWeight';
import { convertCmToFtIn, convertFtInToCm } from '../utils/weightUtils';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const SupplementPage: React.FC = () => {
  const { 
    supplementPlan, setSupplementPlan, userSupplements,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions,
    profile, currentWeight
  } = useContext(AppContext);
  const { t } = useI18n();
  const { measureUnit, weightUnit } = useMeasureUnit();

  const [wizardActive, setWizardActive] = useState(false);
  const [planJustGenerated, setPlanJustGenerated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<SupplementInfo>>({
    gender: 'male',
    activityLevel: 'intermediate',
    trainingDays: [],
    trainingTime: 'afternoon',
    routineType: 'mixed',
    objective: 'maintain',
    proteinConsumption: 'unknown',
    hydration: 2,
    deficiencies: [],
    desiredSupplements: [],
    allergies: [],
    medicalConditions: '',
    consumptionPreferences: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // State for imperial height inputs in wizard
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  useEffect(() => {
    if (wizardActive && measureUnit === 'imperial' && formData.height) {
        const { feet: ft, inches: inc } = convertCmToFtIn(formData.height);
        setFeet(ft > 0 ? String(ft) : '');
        setInches(inc > 0 ? String(inc) : '');
    } else if (wizardActive && measureUnit === 'metric') {
        setFeet('');
        setInches('');
    }
  }, [formData.height, wizardActive, measureUnit]);

  const handleInputChange = (field: keyof SupplementInfo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHeightChangeImperial = (ft: string, inc: string) => {
    const feetNum = parseInt(ft) || 0;
    const inchesNum = parseInt(inc) || 0;
    const totalCm = convertFtInToCm(feetNum, inchesNum);
    handleInputChange('height', totalCm > 0 ? totalCm : undefined);
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => {
        const currentDays = prev.trainingDays || [];
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        return { ...prev, trainingDays: newDays };
    });
  };

  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handleStartWizard = () => {
    const prefilledData: Partial<SupplementInfo> = { ...formData };
    if (profile.gender) {
        prefilledData.gender = profile.gender;
    }
    if (profile.height) {
        prefilledData.height = profile.height;
    }
    if (currentWeight) {
        prefilledData.weight = Math.round(currentWeight);
    }
    setFormData(prefilledData);
    setWizardActive(true);
    setCurrentStep(1);
  };

  const handleGeneratePlan = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.dob) {
      alert(t('supplements_age_warning'));
      return;
    }
    
    const birthDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < 18) {
        alert(t('supplements_age_warning'));
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPlan = generateSupplementPlan(formData as SupplementInfo, t, userSupplements);
      setSupplementPlan(newPlan);
      setWizardActive(false);
      setPlanJustGenerated(true);
      clearNewSuggestions();
    } catch (err) {
      console.error(err);
      setError(t('supplements_error_generating'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditAnswers = () => {
      if (supplementPlan?.info?.dob) {
        setFormData(supplementPlan.info);
      } else {
        const prefilledData: Partial<SupplementInfo> = { ...formData };
        if (profile.gender) prefilledData.gender = profile.gender;
        if (profile.height) prefilledData.height = profile.height;
        if (currentWeight) prefilledData.weight = Math.round(currentWeight);
        setFormData(prefilledData);
      }
      setSupplementPlan(null);
      setWizardActive(true);
      setCurrentStep(1);
  };

  const handleDismissAll = () => {
    dismissAllSuggestions();
    setIsReviewModalOpen(false);
  };

  const handleApplyAll = () => {
    applyAllPlanSuggestions();
    setIsReviewModalOpen(false);
  };

  const renderStep = () => {
    switch(currentStep) {
        case 1: return (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('supplements_step_1_title')}</h3>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_dob_label')}</label>
                    <input type="date" required value={formData.dob || ''} onChange={e => handleInputChange('dob', e.target.value)} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('supplements_weight_label')}</label>
                        <div className="relative mt-1">
                          <input type="number" required value={formData.weight || ''} onChange={e => handleInputChange('weight', parseFloat(e.target.value))} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 pr-12" />
                          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t(`workout_${weightUnit}`)}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">{t('supplements_height_label')}</label>
                        {measureUnit === 'metric' ? (
                            <div className="relative mt-1">
                                <input type="number" required value={formData.height || ''} onChange={e => handleInputChange('height', parseFloat(e.target.value))} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 pr-12" />
                                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t('profile_height_unit_cm')}</span>
                            </div>
                        ) : (
                            <div className="flex gap-2 mt-1">
                                <div className="relative">
                                    <input type="number" required value={feet} onChange={e => { setFeet(e.target.value); handleHeightChangeImperial(e.target.value, inches); }} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 pr-10" />
                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t('profile_height_unit_ft')}</span>
                                </div>
                                <div className="relative">
                                    <input type="number" required value={inches} onChange={e => { setInches(e.target.value); handleHeightChangeImperial(feet, e.target.value); }} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 pr-10" />
                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t('profile_height_unit_in')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_gender_label')}</label>
                    <div className="flex rounded-lg bg-surface p-1 mt-1">
                        {(['male', 'female'] as const).map(g => (
                            <button key={g} type="button" onClick={() => handleInputChange('gender', g)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${formData.gender === g ? 'bg-primary text-white' : 'text-text-secondary'}`}>{t(`supplements_gender_${g}`)}</button>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 2: return (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('supplements_step_2_title')}</h3>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_activity_level_label')}</label>
                    <div className="flex rounded-lg bg-surface p-1 mt-1">
                        {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
                            <button key={l} type="button" onClick={() => handleInputChange('activityLevel', l)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${formData.activityLevel === l ? 'bg-primary text-white' : 'text-text-secondary'}`}>{t(`supplements_activity_level_${l}`)}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_training_days_label')}</label>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {daysOfWeek.map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDayToggle(day)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                                    formData.trainingDays?.includes(day)
                                    ? 'bg-primary text-white'
                                    : 'bg-surface hover:bg-slate-700'
                                }`}
                            >
                                {t(`supplements_day_${day.slice(0, 3)}_short` as any)}
                            </button>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_training_time_label')}</label>
                    <div className="flex rounded-lg bg-surface p-1 mt-1">
                        {(['morning', 'afternoon', 'night'] as const).map(timeKey => (
                            <button key={timeKey} type="button" onClick={() => handleInputChange('trainingTime', timeKey)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${formData.trainingTime === timeKey ? 'bg-primary text-white' : 'text-text-secondary'}`}>{t(`supplements_training_time_${timeKey}`)}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_routine_type_label')}</label>
                    <div className="flex rounded-lg bg-surface p-1 mt-1">
                        {(['strength', 'cardio', 'mixed'] as const).map(typeKey => (
                            <button key={typeKey} type="button" onClick={() => handleInputChange('routineType', typeKey)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${formData.routineType === typeKey ? 'bg-primary text-white' : 'text-text-secondary'}`}>{t(`supplements_routine_type_${typeKey}`)}</button>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 3: return (
             <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('supplements_step_3_title')}</h3>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_objective_label')}</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        {(['gain', 'lose', 'maintain', 'recover'] as const).map(o => (
                            <button key={o} type="button" onClick={() => handleInputChange('objective', o)} className={`px-4 py-3 rounded-md text-sm font-semibold transition-colors ${formData.objective === o ? 'bg-primary text-white' : 'bg-surface'}`}>{t(`supplements_objective_${o}`)}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_protein_label')}</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input type="number" value={typeof formData.proteinConsumption === 'number' ? formData.proteinConsumption : ''} onChange={e => handleInputChange('proteinConsumption', parseFloat(e.target.value))} placeholder={t('supplements_protein_placeholder')} className="w-full bg-surface border border-secondary/50 rounded-lg p-2" />
                        <button type="button" onClick={() => handleInputChange('proteinConsumption', 'unknown')} className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${formData.proteinConsumption === 'unknown' ? 'bg-primary text-white' : 'bg-surface'}`}>{t('supplements_protein_unknown')}</button>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_deficiencies_label')}</label>
                    <input type="text" value={formData.deficiencies?.join(', ') || ''} onChange={e => handleInputChange('deficiencies', e.target.value.split(',').map(s => s.trim()))} placeholder={t('supplements_deficiencies_placeholder')} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_desired_label')}</label>
                    <input type="text" value={formData.desiredSupplements?.join(', ') || ''} onChange={e => handleInputChange('desiredSupplements', e.target.value.split(',').map(s => s.trim()))} placeholder={t('supplements_desired_placeholder')} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
            </div>
        );
        case 4: return (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('supplements_step_4_title')}</h3>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_allergies_label')}</label>
                    <input type="text" value={formData.allergies?.join(', ') || ''} onChange={e => handleInputChange('allergies', e.target.value.split(',').map(s => s.trim()))} placeholder={t('supplements_allergies_placeholder')} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_medical_label')}</label>
                    <input type="text" value={formData.medicalConditions || ''} onChange={e => handleInputChange('medicalConditions', e.target.value)} placeholder={t('supplements_medical_placeholder')} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_preferences_label')}</label>
                    <input type="text" value={formData.consumptionPreferences || ''} onChange={e => handleInputChange('consumptionPreferences', e.target.value)} placeholder={t('supplements_preferences_placeholder')} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_hydration_label')}</label>
                    <input type="range" min="0" max="6" step="0.5" value={formData.hydration || 2} onChange={e => handleInputChange('hydration', parseFloat(e.target.value))} className="w-full mt-1" />
                    <div className="text-center font-bold text-primary">{formData.hydration} L</div>
                </div>
            </div>
        );
        default: return null;
    }
  };

  const renderContent = () => {
    return (
      <div className="space-y-4">
        {newSuggestions.length > 0 && (
          <div className="bg-indigo-600/20 border border-indigo-500 text-indigo-200 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon name="sparkles" className="w-6 h-6 text-indigo-400" />
              <p className="font-semibold">{t('supplements_review_notification_banner', { count: newSuggestions.length })}</p>
            </div>
            <button onClick={() => setIsReviewModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2 px-4 rounded-lg text-sm flex-shrink-0">
              {t('common_view')}
            </button>
          </div>
        )}

        {(() => {
          if (isLoading) {
            return (
                <div className="text-center space-y-4 flex flex-col items-center justify-center h-full pt-10">
                    <Icon name="capsule" className="w-16 h-16 text-primary animate-pulse" />
                    <h2 className="text-2xl font-bold">{t('supplements_generating_plan')}</h2>
                    <p className="text-text-secondary max-w-sm">{t('supplements_generating_plan_desc')}</p>
                </div>
            );
          }
        
          if (supplementPlan && planJustGenerated) {
            return (
              <div className="text-center space-y-6 flex flex-col items-center justify-center h-full pt-10">
                <Icon name="check" className="w-20 h-20 text-success bg-success/20 rounded-full p-4"/>
                <h1 className="text-3xl font-bold">{t('supplements_plan_ready')}</h1>
                <p className="text-text-secondary max-w-md">{t('supplements_plan_ready_desc')}</p>
                <button onClick={() => setPlanJustGenerated(false)} className="bg-primary text-white font-bold py-3 px-8 rounded-lg text-lg">
                  {t('common_ok')}
                </button>
              </div>
            );
          }
        
          if (supplementPlan) {
            return <SupplementSchedule onEditAnswers={handleEditAnswers} />;
          }
        
          if (wizardActive) {
            return (
                <form onSubmit={handleGeneratePlan} className="space-y-6">
                    <h1 className="text-2xl font-bold text-center">{t('supplements_wizard_title')}</h1>
                    {error && <p className="text-red-400 text-center bg-red-500/10 p-3 rounded-lg">{error}</p>}
                    <div className="p-4 bg-surface rounded-lg">
                        {renderStep()}
                    </div>
                    <div className="flex justify-between items-center">
                        {currentStep > 1 ? (
                        <button type="button" onClick={handleBack} className="bg-secondary text-white font-bold py-3 px-6 rounded-lg">{t('common_back')}</button>
                        ) : <div></div>}
                        {currentStep < 4 ? (
                        <button type="button" onClick={handleNext} className="bg-primary text-white font-bold py-3 px-6 rounded-lg">{t('common_next')}</button>
                        ) : (
                        <button type="submit" className="bg-success text-white font-bold py-3 px-6 rounded-lg">{t('supplements_generate_plan_button')}</button>
                        )}
                    </div>
                </form>
            );
          }

          return (
            <div className="text-center space-y-6 flex flex-col items-center justify-center h-full pt-10">
              <Icon name="capsule" className="w-20 h-20 text-primary" />
              <h1 className="text-3xl font-bold">{t('supplements_title')}</h1>
              <p className="text-text-secondary max-w-md">{t('supplements_create_plan_desc')}</p>
              <button onClick={handleStartWizard} className="bg-primary text-white font-bold py-3 px-6 rounded-lg text-lg">
                {t('supplements_create_plan_cta')}
              </button>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <SupplementReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          suggestions={newSuggestions}
          onApply={applyPlanSuggestion}
          onApplyAll={handleApplyAll}
          onDismiss={dismissSuggestion}
          onDismissAll={handleDismissAll}
      />
    </>
  );
};

export default SupplementPage;
