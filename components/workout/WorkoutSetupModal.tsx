
import React, { useState, useContext } from 'react';
import { Routine } from '../../types';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';

interface WorkoutSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If a routine is passed, we are editing it before starting
  // If not, it's an empty workout
  routine?: Routine; 
}

const WorkoutSetupModal: React.FC<WorkoutSetupModalProps> = ({ isOpen, onClose, routine }) => {
  const { startWorkout } = useContext(AppContext);
  const [workoutName, setWorkoutName] = useState(routine?.name || 'New Workout');

  const handleStart = () => {
    const routineToStart: Routine = routine || {
      id: `custom-${Date.now()}`,
      name: workoutName,
      description: 'A custom workout.',
      exercises: []
    };
    startWorkout(routineToStart);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Workout">
      <div className="space-y-4">
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2"
        />
        {/* Here you could add UI to add/remove exercises */}
        <p className="text-text-secondary">Exercise customization not yet implemented.</p>
        
        <button onClick={handleStart} className="w-full bg-primary text-white font-bold py-3 rounded-lg">
          Start
        </button>
      </div>
    </Modal>
  );
};

export default WorkoutSetupModal;
