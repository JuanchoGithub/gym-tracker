import React, { useContext } from 'react';
import { Routine } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { Icon } from '../common/Icon';

interface RoutinePanelProps {
  routine: Routine;
  onClick: (routine: Routine) => void;
}

const RoutinePanel: React.FC<RoutinePanelProps> = ({ routine, onClick }) => {
  const { getExerciseById, deleteRoutine } = useContext(AppContext);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const exerciseNames = routine.exercises
    .map(ex => getExerciseById(ex.exerciseId)?.name)
    .filter(Boolean)
    .join(', ');

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${routine.name}"?`)) {
      deleteRoutine(routine.id);
    }
    setIsMenuOpen(false);
  };

  const isDeletable = !routine.id.startsWith('rt-');

  return (
    <div
      className="bg-surface p-4 rounded-lg shadow cursor-pointer hover:bg-slate-700 transition-colors h-full flex flex-col justify-between relative"
      onClick={() => onClick(routine)}
    >
      <div>
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-primary mb-1 pr-6">{routine.name}</h3>
            {isDeletable && (
                 <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen);}} className="text-text-secondary hover:text-primary p-1 absolute top-[-8px] right-[-8px]">
                        <Icon name="ellipsis" className="w-5 h-5"/>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-6 w-32 bg-slate-600 rounded-md shadow-lg z-10">
                           <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-500 rounded-md">Delete</button>
                        </div>
                    )}
                 </div>
            )}
        </div>
        <p className="text-sm text-text-secondary truncate" title={exerciseNames}>
          {exerciseNames || 'No exercises yet.'}
        </p>
      </div>
      {routine.lastUsed && (
        <p className="text-xs text-text-secondary/70 mt-3 text-right">
          Last used: {new Date(routine.lastUsed).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default RoutinePanel;