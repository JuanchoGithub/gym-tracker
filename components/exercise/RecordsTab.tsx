
import React, { useContext, useMemo, useState } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { PersonalRecords, calculate1RM } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import { useMeasureUnit } from '../../hooks/useWeight';
import { TranslationKey } from '../../contexts/I18nContext';
import { AppContext } from '../../contexts/AppContext';
import OneRepMaxTestRunner from '../onerepmax/OneRepMaxTestRunner';
import CascadeUpdateModal from '../onerepmax/CascadeUpdateModal';
import { calculateSyntheticAnchors, getInferredMax } from '../../services/analyticsService';

interface RecordsTabProps {
  records: PersonalRecords;
  exerciseId: string;
}

const RecordItem: React.FC<{ title: string; record: PersonalRecords[keyof PersonalRecords] }> = ({ title, record }) => {
  const { t } = useI18n();
  const { displayWeight, weightUnit } = useMeasureUnit();

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg flex items-center justify-between">
      <div>
        <p className="text-sm text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-primary">
          {record ? displayWeight(record.value) : '-'}
        </p>
      </div>
      {record && (
        <div className="text-right text-xs text-text-secondary">
          <p>{t('records_achieved_on', { date: new Date(record.session.startTime).toLocaleDateString() })}</p>
          <p>{displayWeight(record.set.weight)}{t(`workout_${weightUnit}` as TranslationKey)} x {record.set.reps} {t('workout_reps')}</p>
        </div>
      )}
    </div>
  );
}

const RecordsTab: React.FC<RecordsTabProps> = ({ records, exerciseId }) => {
  const { t } = useI18n();
  const { profile, applyCalculated1RM, updateOneRepMax, undoAutoUpdate, allTimeBestSets, history, exercises, getExerciseById } = useContext(AppContext);
  const { displayWeight, weightUnit } = useMeasureUnit();
  
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isCascadeOpen, setIsCascadeOpen] = useState(false);
  const [newlyUpdatedMax, setNewlyUpdatedMax] = useState(0);

  const exercise = getExerciseById(exerciseId);
  const storedEntry = profile.oneRepMaxes?.[exerciseId];
  const storedMax = storedEntry?.weight || 0;
  
  const bestSet = allTimeBestSets[exerciseId];
  const calculatedMax = bestSet ? calculate1RM(bestSet.weight, bestSet.reps) : 0;
  
  const hasPendingAutoUpdate = profile.autoUpdated1RMs?.[exerciseId];
  const canApplyCalculated = calculatedMax > storedMax && !hasPendingAutoUpdate;

  // Inference Logic
  const syntheticAnchors = useMemo(() => calculateSyntheticAnchors(history, exercises, profile), [history, exercises, profile]);
  const inferredData = useMemo(() => exercise ? getInferredMax(exercise, syntheticAnchors, exercises) : null, [exercise, syntheticAnchors, exercises]);
  const inferredMax = inferredData ? inferredData.value : 0;

  const displayMax = storedMax > 0 ? storedMax : inferredMax;
  const isInferredOnly = storedMax === 0 && inferredMax > 0;

  const handleTestComplete = (newMax: number) => {
      updateOneRepMax(exerciseId, newMax, 'tested');
      setIsTestRunnerOpen(false);
      setNewlyUpdatedMax(newMax);
      setIsCascadeOpen(true);
  };
  
  const handleApplyInferred = () => {
      if (inferredMax > 0) {
          updateOneRepMax(exerciseId, inferredMax, 'calculated');
      }
  };

  return (
    <div className="space-y-6">
        {/* 1RM Section */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                     <Icon name="weight" className="w-5 h-5 text-indigo-400" />
                     <h3 className="font-bold text-lg text-indigo-100">{t('orm_title')}</h3>
                 </div>
                 {storedEntry ? (
                     <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${storedEntry.method === 'tested' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                         {t(storedEntry.method === 'tested' ? 'orm_tested_badge' : 'orm_estimated_badge')}
                     </span>
                 ) : (
                    isInferredOnly && (
                        <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                            {t('orm_estimated_badge')}
                        </span>
                    )
                 )}
            </div>
            
            <div className="flex justify-between items-end mb-4">
                <div>
                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">{t('orm_current_max')}</p>
                    <p className={`text-3xl font-mono font-bold ${isInferredOnly ? 'text-indigo-300' : 'text-white'}`}>
                        {displayMax > 0 ? displayWeight(displayMax) : '-'} <span className="text-base text-text-secondary/50">{t(('workout_' + weightUnit) as TranslationKey)}</span>
                    </p>
                    {isInferredOnly && (
                         <p className="text-[10px] text-indigo-400/70 uppercase font-bold tracking-wider mt-1">
                             via {inferredData?.source}
                         </p>
                    )}
                </div>
                {calculatedMax > 0 && (
                    <div className="text-right">
                         <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">{t('orm_detail_calculated')}</p>
                         <p className="text-xl font-mono font-bold text-text-secondary">
                            {displayWeight(calculatedMax)} <span className="text-xs">{t(('workout_' + weightUnit) as TranslationKey)}</span>
                         </p>
                    </div>
                )}
            </div>
            
            <div className="flex flex-col gap-2">
                {canApplyCalculated && (
                    <button 
                        onClick={() => applyCalculated1RM(exerciseId, calculatedMax)}
                        className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-2 px-4 rounded-lg border border-green-500/30 transition-colors text-sm"
                    >
                        {t('orm_detail_action_update')}
                    </button>
                )}
                
                {isInferredOnly && (
                    <button 
                        onClick={handleApplyInferred}
                        className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold py-2 px-4 rounded-lg border border-indigo-500/30 transition-colors text-sm"
                    >
                        {t('orm_detail_action_update')}
                    </button>
                )}
                
                {hasPendingAutoUpdate && (
                     <button 
                        onClick={() => undoAutoUpdate(exerciseId)}
                        className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold py-2 px-4 rounded-lg border border-indigo-500/30 transition-colors text-sm"
                    >
                        {t('common_undo')} Auto-Update
                    </button>
                )}

                <button 
                    onClick={() => setIsTestRunnerOpen(true)}
                    className="w-full bg-surface hover:bg-white/10 text-text-primary font-bold py-2 px-4 rounded-lg border border-white/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Icon name="trophy" className="w-4 h-4" />
                    {t('orm_action_recalibrate')}
                </button>
            </div>
        </div>

        {/* Records List */}
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                <Icon name="trophy" className="w-6 h-6 text-warning" />
                <h3 className="font-bold text-lg">{t('records_pr')}</h3>
            </div>
            <RecordItem title={t('records_max_weight')} record={records.maxWeight} />
            <RecordItem title={t('records_max_reps')} record={records.maxReps} />
            <RecordItem title={t('records_max_volume')} record={records.maxVolume} />
        </div>

        <OneRepMaxTestRunner 
            isOpen={isTestRunnerOpen} 
            onClose={() => setIsTestRunnerOpen(false)} 
            exerciseId={exerciseId}
            targetMax={calculatedMax || storedMax || 20}
            onComplete={handleTestComplete}
        />

        <CascadeUpdateModal 
            isOpen={isCascadeOpen}
            onClose={() => setIsCascadeOpen(false)}
            parentExerciseId={exerciseId}
            newParentMax={newlyUpdatedMax}
        />
    </div>
  );
};

export default RecordsTab;
