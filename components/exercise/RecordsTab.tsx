
import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import { PersonalRecords } from '../../utils/workoutUtils';
import { Icon } from '../common/Icon';
import { useWeight } from '../../hooks/useWeight';

interface RecordsTabProps {
  records: PersonalRecords;
}

const RecordItem: React.FC<{ title: string; record: PersonalRecords[keyof PersonalRecords] }> = ({ title, record }) => {
  const { t } = useI18n();
  const { displayWeight, unit } = useWeight();

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
          {/* FIX: Used a template literal to construct a valid translation key for the weight unit. */}
          <p>{displayWeight(record.set.weight)}{t(`workout_${unit}`)} x {record.set.reps} reps</p>
        </div>
      )}
    </div>
  );
}

const RecordsTab: React.FC<RecordsTabProps> = ({ records }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
        <div className="flex items-center space-x-2">
            <Icon name="trophy" className="w-6 h-6 text-warning" />
            <h3 className="font-bold text-lg">{t('records_pr')}</h3>
        </div>
        <RecordItem title={t('records_max_weight')} record={records.maxWeight} />
        <RecordItem title={t('records_max_reps')} record={records.maxReps} />
        <RecordItem title={t('records_max_volume')} record={records.maxVolume} />
    </div>
  );
};

export default RecordsTab;
