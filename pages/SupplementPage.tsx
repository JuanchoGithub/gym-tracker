
import React, { useState, useContext, FormEvent, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ActiveWorkoutContext } from '../contexts/ActiveWorkoutContext';
import { useI18n } from '../hooks/useI18n';
import { SupplementInfo, SupplementPlanItem } from '../types';
import { generateSupplementPlan } from '../services/supplementService';
import { Icon } from '../components/common/Icon';
import SupplementSchedule from '../components/supplements/SupplementSchedule';
import SupplementReviewView from '../components/supplements/SupplementReviewView';
import { useMeasureUnit } from '../hooks/useWeight';
import { convertCmToFtIn, convertFtInToCm } from '../utils/weightUtils';
import { TranslationKey } from '../contexts/I18nContext';

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const SupplementPage: React.FC = () => {
  const { 
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions, triggerManualPlanReview,
    profile, currentWeight, history, takenSupplements, updateSupplementPlanItem
  } = useContext(AppContext);
  const { activeWorkout, isWorkoutMinimized } = useContext(ActiveWorkoutContext);
  const { t } = useI18n();
  const { measureUnit, weightUnit, displayWeight, getStoredWeight } = useMeasureUnit();

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
  const [isReviewViewOpen, setIsReviewViewOpen] = useState(false);
  
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
    if (error) setError(null);
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

  const handleProteinUnknownToggle = () => {
    if (formData.proteinConsumption === 'unknown') {
        handleInputChange('proteinConsumption', undefined);
    } else {
        handleInputChange('proteinConsumption', 'unknown');
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
        if (!formData.dob) {
          setError(t('supplements_step1_error_dob'));
          return;
        }
        if (!formData.weight) {
          setError(t('supplements_step1_error_weight'));
          return;
        }
    }
    
    setError(null);
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => prev - 1);
  };

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
    setError(null);
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

      // Preserve IDs and Stock from previous plan to maintain history and tracking
      if (supplementPlan) {
          const usedOldIds = new Set<string>();

          newPlan.plan = newPlan.plan.map(newItem => {
              if (newItem.isCustom) return newItem; // Custom items preserve ID via userSupplements

              const match = supplementPlan.plan.find(oldItem => 
                  !oldItem.isCustom &&
                  oldItem.supplement === newItem.supplement && 
                  oldItem.time === newItem.time &&
                  !usedOldIds.has(oldItem.id)
              );
              
              if (match) {
                  usedOldIds.add(match.id);
                  // Preserve ID for history continuity
                  // Preserve Stock for tracking
                  return { ...newItem, id: match.id, stock: match.stock };
              }
              return newItem;
          });
      }

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
      // IMPORTANT: Do not setSupplementPlan(null) here.
      // This allows the user to cancel the wizard and return to their existing plan.
      setWizardActive(true);
      setCurrentStep(1);
      setError(null);
      setIsReviewViewOpen(false); // Close review view if open
  };

  const handleManualReview = () => {
      triggerManualPlanReview();
      setIsReviewViewOpen(true);
  };

  const handleDismissAll = () => {
    dismissAllSuggestions();
    setIsReviewViewOpen(false);
  };

  const handleApplyAll = () => {
    applyAllPlanSuggestions();
    setIsReviewViewOpen(false);
  };

  const handleAddItem = (newItemData: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => {
      const newItem: SupplementPlanItem = {
          ...newItemData,
          id: `custom-${Date.now()}`,
          isCustom: true
      };
      
      const newCustomSupplements = [...userSupplements, newItem];
      setUserSupplements(newCustomSupplements);
  
      if (supplementPlan) {
          const newPlanItems = [...supplementPlan.plan, newItem];
          setSupplementPlan({ ...supplementPlan, plan: newPlanItems });
      }
  };

  const handleRemoveItem = (itemId: string) => {
      if (userSupplements.some(s => s.id === itemId)) {
          setUserSupplements(prev => prev.filter(s => s.id !== itemId));
      }
      if (supplementPlan) {
          setSupplementPlan({ 
              ...supplementPlan, 
              plan: supplementPlan.plan.filter(p => p.id !== itemId) 
          });
      }
  };

  const renderStep = () => {
    switch(currentStep) {
        case 1: return (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('supplements_step_1_title')}</h3>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">
                        {t('supplements_dob_label')} <span className="text-primary">*</span>
                    </label>
                    <input type="date" required value={formData.dob || ''} onChange={e => handleInputChange('dob', e.target.value)} className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">
                            {t('supplements_weight_label')} <span className="text-primary">*</span>
                        </label>
                        <div className="relative mt-1">
                          <input 
                              type="number" 
                              required 
                              value={formData.weight ? displayWeight(formData.weight) : ''} 
                              onChange={e => handleInputChange('weight', getStoredWeight(parseFloat(e.target.value)))} 
                              className="w-full bg-surface border border-secondary/50 rounded-lg p-2 pr-12" 
                          />
                          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t(`workout_${weightUnit}` as TranslationKey)}</span>
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
                        <input 
                            type="number" 
                            value={typeof formData.proteinConsumption === 'number' ? formData.proteinConsumption : ''} 
                            onChange={e => handleInputChange('proteinConsumption', parseFloat(e.target.value) || undefined)} 
                            placeholder={t('supplements_protein_placeholder')} 
                            className="w-full bg-surface border border-secondary/50 rounded-lg p-2 disabled:bg-slate-800 disabled:text-text-secondary/70 disabled:cursor-not-allowed"
                            disabled={formData.proteinConsumption === 'unknown'}
                        />
                        <button 
                            type="button" 
                            onClick={handleProteinUnknownToggle} 
                            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${formData.proteinConsumption === 'unknown' ? 'bg-primary text-white' : 'bg-surface'}`}
                        >
                            {t('supplements_protein_unknown')}
                        </button>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_deficiencies_label')}</label>
                    <input 
                        type="text" 
                        value={formData.deficiencies?.join(', ') || ''} 
                        onChange={e => handleInputChange('deficiencies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                        placeholder={t('supplements_deficiencies_placeholder')} 
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" 
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_desired_label')}</label>
                    <input 
                        type="text" 
                        value={formData.desiredSupplements?.join(', ') || ''} 
                        onChange={e => handleInputChange('desiredSupplements', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                        placeholder={t('supplements_desired_placeholder')} 
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" 
                    />
                </div>
            </div>
        );
        case 4: return (
             <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('supplements_step_4_title')}</h3>
                 <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_allergies_label')}</label>
                    <input 
                        type="text" 
                        value={formData.allergies?.join(', ') || ''} 
                        onChange={e => handleInputChange('allergies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                        placeholder={t('supplements_allergies_placeholder')} 
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_medical_label')}</label>
                    <input 
                        type="text" 
                        value={formData.medicalConditions || ''} 
                        onChange={e => handleInputChange('medicalConditions', e.target.value)} 
                        placeholder={t('supplements_medical_placeholder')} 
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_preferences_label')}</label>
                    <input 
                        type="text" 
                        value={formData.consumptionPreferences || ''} 
                        onChange={e => handleInputChange('consumptionPreferences', e.target.value)} 
                        placeholder={t('supplements_preferences_placeholder')} 
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary">{t('supplements_hydration_label')}</label>
                    <input 
                        type="number" 
                        step="0.1" 
                        value={formData.hydration || ''} 
                        onChange={e => handleInputChange('hydration', parseFloat(e.target.value))} 
                        className="w-full bg-surface border border-secondary/50 rounded-lg p-2 mt-1" 
                    />
                </div>
            </div>
        );
        default: return null;
    }
  };

  if (isReviewViewOpen) {
      return (
          <SupplementReviewView 
            onBack={() => setIsReviewViewOpen(false)}
            suggestions={newSuggestions}
            history={history}
            takenSupplements={takenSupplements}
            allSupplements={supplementPlan ? supplementPlan.plan : userSupplements}
            onApply={applyPlanSuggestion}
            onApplyAll={handleApplyAll}
            onDismiss={dismissSuggestion}
            onDismissAll={handleDismissAll}
            onRecalculate={handleEditAnswers}
            onAddItem={handleAddItem}
            onUpdateItem={updateSupplementPlanItem}
            onRemoveItem={handleRemoveItem}
          />
      );
  }

  return (
    <div className="space-y-4">
      {!wizardActive && !supplementPlan && !planJustGenerated && (
        <div className="text-center py-10 px-4">
            <div className="mb-6 flex justify-center">
                <Icon name="capsule" className="w-20 h-20 text-primary/80" />
            </div>
            <h1 className="text-3xl font-bold mb-4">{t('supplements_title')}</h1>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">{t('supplements_create_plan_desc')}</p>
            <button 
                onClick={handleStartWizard}
                className="bg-primary hover:bg-sky-500 text-white font-bold py-4 px-8 rounded-full shadow-lg text-lg transition-transform hover:scale-105"
            >
                {t('supplements_create_plan_cta')}
            </button>
        </div>
      )}

      {wizardActive && (
        <div className="bg-surface p-4 sm:p-6 rounded-lg shadow-lg max-w-lg mx-auto">
            <div className="mb-6">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
                </div>
                <div className="text-right text-xs text-text-secondary mt-1">{t('common_step')} {currentStep} / 4</div>
            </div>

            <form onSubmit={handleGeneratePlan}>
                {renderStep()}
                
                <div className="flex justify-between mt-8 pt-4 border-t border-secondary/20">
                    {currentStep > 1 ? (
                        <button type="button" onClick={handleBack} className="bg-secondary hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">{t('common_back')}</button>
                    ) : (
                        <button type="button" onClick={() => setWizardActive(false)} className="text-text-secondary hover:text-primary font-bold py-2 px-4">{t('common_cancel')}</button>
                    )}

                    {currentStep < 4 ? (
                        <button type="button" onClick={handleNext} className="bg-primary hover:bg-sky-500 text-white font-bold py-2 px-6 rounded-lg transition-colors ml-auto">{t('common_next')}</button>
                    ) : (
                         <button type="submit" disabled={isLoading} className="bg-success hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors ml-auto flex items-center gap-2">
                            {isLoading ? (
                                <>
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    <span>Generating...</span>
                                </>
                            ) : t('supplements_generate_plan_button')}
                         </button>
                    )}
                </div>
                {error && <p className="text-red-400 text-center mt-4 text-sm font-medium bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
            </form>
        </div>
      )}

      {!wizardActive && (
          // Ensure we render even if plan is null (using userSupplements)
          (supplementPlan || userSupplements.length > 0 || planJustGenerated) && (
            <SupplementSchedule 
                onEditAnswers={handleEditAnswers} 
                onReviewPlan={handleManualReview}
                onAddItem={handleAddItem}
                onUpdateItem={updateSupplementPlanItem}
                onRemoveItem={handleRemoveItem}
            />
          )
      )}

        {!wizardActive && newSuggestions.length > 0 && !isReviewViewOpen && (
            <div className={`fixed left-4 right-4 z-30 transition-all duration-300 ${activeWorkout && isWorkoutMinimized ? 'bottom-[calc(16rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(7.5rem+env(safe-area-inset-bottom))]'}`}>
                <div className="bg-primary text-white p-4 rounded-lg shadow-xl flex items-center justify-between cursor-pointer" onClick={() => setIsReviewViewOpen(true)}>
                    <div className="flex items-center gap-3">
                        <Icon name="sparkles" className="w-6 h-6 text-yellow-300" />
                        <div>
                            <p className="font-bold">{t('supplements_review_notification_banner', { count: newSuggestions.length })}</p>
                        </div>
                    </div>
                    <Icon name="arrow-right" className="w-5 h-5" />
                </div>
            </div>
        )}
    </div>
  );
};

export default SupplementPage;
