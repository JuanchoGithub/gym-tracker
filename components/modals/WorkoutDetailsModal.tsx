
import React, { useState, useEffect, useMemo, useContext } from 'react';
import Modal from '../common/Modal';
import { WorkoutSession } from '../../types';
import { formatTime, toDateTimeLocal } from '../../utils/timeUtils';
import { useI18n } from '../../hooks/useI18n';
import ToggleSwitch from '../common/ToggleSwitch';
import { AppContext } from '../../contexts/AppContext';

interface WorkoutDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutSession;
  onSave: (updatedDetails: Partial<WorkoutSession>) => void;
}

const WorkoutDetailsModal: React.FC<WorkoutDetailsModalProps> = ({ isOpen, onClose, workout, onSave }) => {
  const { t } = useI18n();
  const { fontSize } = useContext(AppContext);
  const [name, setName] = useState(workout.routineName);
  const [isAuto, setIsAuto] = useState(workout.endTime === 0);
  const [start, setStart] = useState(toDateTimeLocal(workout.startTime));
  const [end, setEnd] = useState(toDateTimeLocal(workout.endTime));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isAuto) {
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(timer);
    }
  }, [isAuto]);

  const duration = useMemo(() => {
    const startTime = new Date(start).getTime();
    if (!startTime || isNaN(startTime)) return '00:00:00';

    const endTime = isAuto ? now : (end ? new Date(end).getTime() : startTime);
    if (!endTime || isNaN(endTime) || endTime < startTime) return '00:00:00';
    
    const diffSeconds = Math.floor((endTime - startTime) / 1000);
    return formatTime(diffSeconds);
  }, [start, end, isAuto, now]);

  const handleSave = () => {
    const newStartTime = new Date(start).getTime();
    const newEndTime = isAuto || !end ? 0 : new Date(end).getTime();

    if (isNaN(newStartTime) || (!isAuto && isNaN(newEndTime))) {
        alert(t('workout_details_modal_invalid_date_alert'));
        return;
    }
    if (!isAuto && newEndTime < newStartTime) {
        alert(t('workout_details_modal_end_before_start_alert'));
        return;
    }

    onSave({
      routineName: name,
      startTime: newStartTime,
      endTime: newEndTime,
    });
  };

  const inputPadding = fontSize === 'xl' ? 'p-1' : (fontSize === 'large' ? 'p-1.5' : 'p-2');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('workout_details_modal_title')}>
      <div className="space-y-4 text-text-primary">
        <div>
          <label htmlFor="workout-name" className="block text-sm font-medium text-text-secondary mb-1">{t('workout_details_modal_name_label')}</label>
          <input
            id="workout-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full bg-slate-900 border border-secondary/50 rounded-lg ${inputPadding}`}
          />
        </div>

        <div className="flex items-center justify-between">
            <div>
                <label className="block text-sm font-medium text-text-secondary">{t('workout_details_modal_auto_timer_label')}</label>
                <p className="text-xs text-text-secondary">{t('workout_details_modal_auto_timer_desc')}</p>
            </div>
            <ToggleSwitch checked={isAuto} onChange={setIsAuto} />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('workout_details_modal_duration_label')}</label>
                <div className={`font-mono text-lg bg-slate-900 rounded-lg ${inputPadding} text-center`} aria-live="polite">{duration}</div>
            </div>
             <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-text-secondary mb-1">{t('workout_details_modal_end_date_label')}</label>
                {isAuto ? (
                    <div className={`text-lg bg-slate-900 rounded-lg ${inputPadding} text-center text-warning`}>{t('workout_details_modal_active_now')}</div>
                ) : (
                    <input
                        id="end-date"
                        type="datetime-local"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className={`w-full bg-slate-900 border border-secondary/50 rounded-lg ${inputPadding}`}
                        disabled={isAuto}
                    />
                )}
            </div>
        </div>

        <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-text-secondary mb-1">{t('workout_details_modal_start_date_label')}</label>
            <input
                id="start-date"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={`w-full bg-slate-900 border border-secondary/50 rounded-lg ${inputPadding}`}
            />
        </div>
        
        <button onClick={handleSave} className="w-full bg-primary text-white font-bold py-3 rounded-lg mt-4">
          {t('workout_details_modal_save_button')}
        </button>
      </div>
    </Modal>
  );
};

export default WorkoutDetailsModal;
