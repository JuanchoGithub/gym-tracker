import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { WorkoutSession } from '../../types';
import { formatTime, toDateTimeLocal } from '../../utils/timeUtils';

interface WorkoutDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutSession;
  onSave: (updatedDetails: Partial<WorkoutSession>) => void;
}

const WorkoutDetailsModal: React.FC<WorkoutDetailsModalProps> = ({ isOpen, onClose, workout, onSave }) => {
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
        alert("Invalid date format.");
        return;
    }
    if (!isAuto && newEndTime < newStartTime) {
        alert("End time cannot be before start time.");
        return;
    }

    onSave({
      routineName: name,
      startTime: newStartTime,
      endTime: newEndTime,
    });
  };
  
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-primary' : 'bg-secondary'}`}
      aria-pressed={checked}
    >
      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Workout Details">
      <div className="space-y-4 text-text-primary">
        <div>
          <label htmlFor="workout-name" className="block text-sm font-medium text-text-secondary mb-1">Workout Name</label>
          <input
            id="workout-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2"
          />
        </div>

        <div className="flex items-center justify-between">
            <div>
                <label className="block text-sm font-medium text-text-secondary">Automatic Timer</label>
                <p className="text-xs text-text-secondary">Track duration automatically.</p>
            </div>
            <ToggleSwitch checked={isAuto} onChange={setIsAuto} />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Duration</label>
                <div className="font-mono text-lg bg-slate-900 rounded-lg p-2 text-center" aria-live="polite">{duration}</div>
            </div>
             <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-text-secondary mb-1">End Date</label>
                {isAuto ? (
                    <div className="text-lg bg-slate-900 rounded-lg p-2 text-center text-warning">Active Now</div>
                ) : (
                    <input
                        id="end-date"
                        type="datetime-local"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2"
                        disabled={isAuto}
                    />
                )}
            </div>
        </div>

        <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-text-secondary mb-1">Start Date</label>
            <input
                id="start-date"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2"
            />
        </div>
        
        <button onClick={handleSave} className="w-full bg-primary text-white font-bold py-3 rounded-lg mt-4">
          Save Changes
        </button>
      </div>
    </Modal>
  );
};

export default WorkoutDetailsModal;
