
import React, { useContext, useState, useRef } from 'react';
import { Routine } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import ConfirmModal from '../modals/ConfirmModal';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useExerciseName } from '../../hooks/useExerciseName';

interface RoutinePanelProps {
  routine: Routine;
  onClick: (routine: Routine) => void;
  onEdit?: (routine: Routine) => void;
  onDuplicate?: (routine: Routine) => void;
}

const RoutinePanel: React.FC<RoutinePanelProps> = ({ routine, onClick, onEdit, onDuplicate }) => {
  const { getExerciseById, deleteRoutine, upsertRoutine, deleteHistorySession, updateHistorySession } = useContext(AppContext);
  const { t } = useI18n();
  const getExerciseName = useExerciseName();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [newName, setNewName] = useState(routine.name);
  const [newNote, setNewNote] = useState(routine.description);
  
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsMenuOpen(false));

  // Localization Logic for System Routines
  const routineNameKey = `${routine.id.replace(/-/g, '_')}_name`;
  const localizedName = t(routineNameKey as any);
  const displayName = localizedName !== routineNameKey ? localizedName : routine.name;

  const routineDescKey = `${routine.id.replace(/-/g, '_')}_desc`;
  const localizedDesc = t(routineDescKey as any);
  const displayDescription = localizedDesc !== routineDescKey ? localizedDesc : routine.description;

  const routineType = routine.routineType || 'strength';
  const typeLabel = routineType === 'hiit' ? t('template_editor_type_hiit') : t('template_editor_type_strength');
  const typeColor = routineType === 'hiit' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-primary/10 text-primary border-primary/20';

  const exerciseNames = routine.exercises
    .map(ex => {
        const info = getExerciseById(ex.exerciseId);
        return info ? getExerciseName(info) : null;
    })
    .filter(Boolean)
    .join(', ');

  const handleOpenDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
    setIsMenuOpen(false);
  };
  
  const handleConfirmDelete = () => {
    if (routine.isTemplate) {
        deleteRoutine(routine.id);
    } else {
        deleteHistorySession(routine.id);
    }
    setIsConfirmingDelete(false);
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(routine);
    setIsMenuOpen(false);
  };
  
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(routine);
    setIsMenuOpen(false);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
        if (routine.isTemplate) {
            upsertRoutine({ ...routine, name: newName.trim() });
        } else {
            updateHistorySession(routine.id, { routineName: newName.trim() });
        }
    }
    setIsRenameModalOpen(false);
  };
  
  const handleSaveNote = (e: React.FormEvent) => {
      e.preventDefault();
      upsertRoutine({ ...routine, description: newNote });
      setIsNoteModalOpen(false);
  };

  const isCustomTemplate = routine.isTemplate && !routine.id.startsWith('rt-');
  const isSampleTemplate = routine.isTemplate && routine.id.startsWith('rt-');
  const isLatestWorkout = !routine.isTemplate;

  const menuItems = [];

  if (isSampleTemplate) {
    menuItems.push({ id: 'duplicate', label: t('common_duplicate'), action: handleDuplicate, className: 'text-text-primary', icon: 'duplicate' });
  }

  if (isCustomTemplate) {
    menuItems.push({ id: 'edit', label: t('routine_panel_edit_exercises'), action: handleEdit, className: 'text-text-primary', icon: 'edit' });
    menuItems.push({ id: 'duplicate', label: t('common_duplicate'), action: handleDuplicate, className: 'text-text-primary', icon: 'duplicate' });
    menuItems.push({ id: 'note', label: t('routine_panel_edit_note'), action: (e: React.MouseEvent) => { e.stopPropagation(); setIsNoteModalOpen(true); setNewNote(routine.description); setIsMenuOpen(false); }, className: 'text-text-primary', icon: 'clipboard-list' });
  }

  if (isCustomTemplate || isLatestWorkout) {
    menuItems.push({ id: 'rename', label: t('common_rename'), action: (e: React.MouseEvent) => { e.stopPropagation(); setIsRenameModalOpen(true); setNewName(routine.name); setIsMenuOpen(false); }, className: 'text-text-primary', icon: 'edit' });
    menuItems.push({ id: 'delete', label: t('common_delete'), action: handleOpenDeleteConfirm, className: 'text-danger', icon: 'trash' });
  }


  return (
    <>
      <div
        className="group bg-surface/50 backdrop-blur-sm border border-white/5 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:bg-surface/80 transition-all duration-200 cursor-pointer h-full flex flex-col justify-between relative active:scale-[0.98]"
        onClick={() => onClick(routine)}
      >
        <div>
          <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-lg text-text-primary mb-1 pr-6 leading-tight group-hover:text-primary transition-colors">{displayName}</h3>
              {menuItems.length > 0 && (
                   <div className="relative" ref={menuRef}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen);}} 
                        className="text-text-secondary hover:text-primary p-2 -mr-2 -mt-2 rounded-full hover:bg-white/5 transition-colors"
                      >
                          <Icon name="ellipsis" className="w-5 h-5"/>
                      </button>
                      {isMenuOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden ring-1 ring-black/20">
                            {menuItems.map((item) => (
                                <button key={item.id} onClick={item.action} className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3 ${item.className}`}>
                                    <Icon name={item.icon as any} className="w-4 h-4 opacity-70" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                          </div>
                      )}
                   </div>
              )}
          </div>
          <div className="mt-2 mb-3 flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${typeColor}`}>
              {typeLabel}
            </span>
             {routine.lastUsed && (
              <span className="text-[10px] text-text-secondary/60 flex items-center">
                <Icon name="history" className="w-3 h-3 mr-1 opacity-60" />
                {new Date(routine.lastUsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed" title={exerciseNames}>
            {exerciseNames || t('routine_panel_no_exercises')}
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleConfirmDelete}
        title={routine.isTemplate ? t('routine_panel_delete_confirm_title') : t('history_delete_confirm_title')}
        message={t('routine_panel_delete_confirm', { name: displayName })}
        confirmText={t('common_delete')}
        confirmButtonClass="bg-danger hover:bg-red-600"
      />

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title={routine.isTemplate ? t('routine_panel_rename_title') : t('routine_panel_rename_workout_title')}>
          <form onSubmit={handleSaveRename}>
              <input 
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-background border border-surface-highlight rounded-lg p-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsRenameModalOpen(false)} className="px-4 py-2 rounded-lg text-text-secondary hover:bg-white/5 transition-colors">{t('common_cancel')}</button>
                  <button type="submit" className="bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-content transition-colors shadow-lg shadow-primary/20">{t('common_save')}</button>
              </div>
          </form>
      </Modal>

      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title={t('routine_panel_edit_note_title')}>
          <form onSubmit={handleSaveNote}>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-background border border-surface-highlight rounded-lg p-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mb-4"
                rows={4}
                placeholder={t('routine_panel_note_placeholder')}
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 rounded-lg text-text-secondary hover:bg-white/5 transition-colors">{t('common_cancel')}</button>
                  <button type="submit" className="bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-content transition-colors shadow-lg shadow-primary/20">{t('common_save')}</button>
              </div>
          </form>
      </Modal>
    </>
  );
};

export default RoutinePanel;
