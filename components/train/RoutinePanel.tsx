import React, { useContext, useState } from 'react';
import { Routine } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';

interface RoutinePanelProps {
  routine: Routine;
  onClick: (routine: Routine) => void;
  onEdit?: (routine: Routine) => void;
}

const RoutinePanel: React.FC<RoutinePanelProps> = ({ routine, onClick, onEdit }) => {
  const { getExerciseById, deleteRoutine, upsertRoutine } = useContext(AppContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newName, setNewName] = useState(routine.name);
  const [newNote, setNewNote] = useState(routine.description);

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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(routine);
    setIsMenuOpen(false);
  };
  
  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
        upsertRoutine({ ...routine, name: newName.trim() });
    }
    setIsRenameModalOpen(false);
  };
  
  const handleSaveNote = (e: React.FormEvent) => {
      e.preventDefault();
      upsertRoutine({ ...routine, description: newNote });
      setIsNoteModalOpen(false);
  };

  const isEditable = onEdit && routine.isTemplate && !routine.id.startsWith('rt-');
  const isDeletable = !routine.id.startsWith('rt-');

  return (
    <>
      <div
        className="bg-surface p-4 rounded-lg shadow cursor-pointer hover:bg-slate-700 transition-colors h-full flex flex-col justify-between relative"
        onClick={() => onClick(routine)}
      >
        <div>
          <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg text-primary mb-1 pr-6">{routine.name}</h3>
              {(isEditable || isDeletable) && (
                   <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen);}} className="text-text-secondary hover:text-primary p-1 absolute top-[-8px] right-[-8px]">
                          <Icon name="ellipsis" className="w-5 h-5"/>
                      </button>
                      {isMenuOpen && (
                          <div className="absolute right-0 mt-6 w-40 bg-slate-600 rounded-md shadow-lg z-10" onMouseLeave={() => setIsMenuOpen(false)}>
                             {isEditable && <button onClick={handleEdit} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-slate-500 rounded-t-md">Edit Exercises</button>}
                             {isEditable && <button onClick={(e) => { e.stopPropagation(); setIsRenameModalOpen(true); setNewName(routine.name); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-slate-500">Rename</button>}
                             {isEditable && <button onClick={(e) => { e.stopPropagation(); setIsNoteModalOpen(true); setNewNote(routine.description); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-slate-500">Edit Note</button>}
                             {isDeletable && <button onClick={handleDelete} className={`w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-500 ${isEditable ? 'rounded-b-md' : 'rounded-md'}`}>Delete</button>}
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

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Rename Template">
          <form onSubmit={handleSaveRename}>
              <input 
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsRenameModalOpen(false)} className="bg-secondary px-4 py-2 rounded-lg">Cancel</button>
                  <button type="submit" className="bg-primary px-4 py-2 rounded-lg">Save</button>
              </div>
          </form>
      </Modal>

      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Edit Note">
          <form onSubmit={handleSaveNote}>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mb-4"
                rows={4}
                placeholder="Add a description for your template..."
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsNoteModalOpen(false)} className="bg-secondary px-4 py-2 rounded-lg">Cancel</button>
                  <button type="submit" className="bg-primary px-4 py-2 rounded-lg">Save</button>
              </div>
          </form>
      </Modal>
    </>
  );
};

export default RoutinePanel;