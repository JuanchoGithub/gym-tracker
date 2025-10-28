import React, { useContext, useState, useRef } from 'react';
import { Routine } from '../../types';
import { AppContext } from '../../contexts/AppContext';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import ConfirmModal from '../modals/ConfirmModal';
import { useClickOutside } from '../../hooks/useClickOutside';

interface RoutinePanelProps {
  routine: Routine;
  onClick: (routine: Routine) => void;
  onEdit?: (routine: Routine) => void;
}

const RoutinePanel: React.FC<RoutinePanelProps> = ({ routine, onClick, onEdit }) => {
  const { getExerciseById, deleteRoutine, upsertRoutine } = useContext(AppContext);
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [newName, setNewName] = useState(routine.name);
  const [newNote, setNewNote] = useState(routine.description);
  
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsMenuOpen(false));

  const exerciseNames = routine.exercises
    .map(ex => getExerciseById(ex.exerciseId)?.name)
    .filter(Boolean)
    .join(', ');

  const handleOpenDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(true);
    setIsMenuOpen(false);
  };
  
  const handleConfirmDelete = () => {
    deleteRoutine(routine.id);
    setIsConfirmingDelete(false);
  }

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
  const isRenameable = isEditable || (!routine.isTemplate && isDeletable);
  
  const menuItems = [];
  if (isEditable) {
      menuItems.push({
          id: 'edit',
          label: t('routine_panel_edit_exercises'),
          action: handleEdit,
          className: 'text-text-primary',
      });
  }
  if (isRenameable) {
      menuItems.push({
          id: 'rename',
          label: t('common_rename'),
          action: (e: React.MouseEvent) => { e.stopPropagation(); setIsRenameModalOpen(true); setNewName(routine.name); setIsMenuOpen(false); },
          className: 'text-text-primary',
      });
  }
  if (isEditable) {
      menuItems.push({
          id: 'note',
          label: t('routine_panel_edit_note'),
          action: (e: React.MouseEvent) => { e.stopPropagation(); setIsNoteModalOpen(true); setNewNote(routine.description); setIsMenuOpen(false); },
          className: 'text-text-primary',
      });
  }
  if (isDeletable) {
      menuItems.push({
          id: 'delete',
          label: t('common_delete'),
          action: handleOpenDeleteConfirm,
          className: 'text-red-400',
      });
  }

  return (
    <>
      <div
        className="bg-surface p-3 sm:p-4 rounded-lg shadow cursor-pointer hover:bg-slate-700 transition-colors h-full flex flex-col justify-between relative"
        onClick={() => onClick(routine)}
      >
        <div>
          <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg text-primary mb-1 pr-6">{routine.name}</h3>
              {menuItems.length > 0 && (
                   <div className="relative" ref={menuRef}>
                      <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen);}} className="text-text-secondary hover:text-primary p-1 absolute top-[-8px] right-[-8px]">
                          <Icon name="ellipsis" className="w-5 h-5"/>
                      </button>
                      {isMenuOpen && (
                          <div className="absolute right-0 mt-6 w-48 bg-slate-600 rounded-md shadow-lg z-10">
                            {menuItems.map((item, index) => {
                                const isFirst = index === 0;
                                const isLast = index === menuItems.length - 1;
                                let classNames = 'w-full text-left px-3 py-2 text-sm hover:bg-slate-500';
                                if (isFirst && isLast) classNames += ' rounded-md';
                                else if (isFirst) classNames += ' rounded-t-md';
                                else if (isLast) classNames += ' rounded-b-md';

                                return (
                                    <button key={item.id} onClick={item.action} className={`${classNames} ${item.className}`}>
                                        {item.label}
                                    </button>
                                );
                            })}
                          </div>
                      )}
                   </div>
              )}
          </div>
          <p className="text-sm text-text-secondary truncate" title={exerciseNames}>
            {exerciseNames || t('routine_panel_no_exercises')}
          </p>
        </div>
        {routine.lastUsed && (
          <p className="text-xs text-text-secondary/70 mt-3 text-right">
            {t('routine_panel_last_used', { date: new Date(routine.lastUsed).toLocaleDateString() })}
          </p>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleConfirmDelete}
        title={routine.isTemplate ? t('routine_panel_delete_confirm_title') : t('history_delete_confirm_title')}
        message={t('routine_panel_delete_confirm', { name: routine.name })}
        confirmText={t('common_delete')}
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title={routine.isTemplate ? t('routine_panel_rename_title') : t('routine_panel_rename_workout_title')}>
          <form onSubmit={handleSaveRename}>
              <input 
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mb-4"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsRenameModalOpen(false)} className="bg-secondary px-4 py-2 rounded-lg">{t('common_cancel')}</button>
                  <button type="submit" className="bg-primary px-4 py-2 rounded-lg">{t('common_save')}</button>
              </div>
          </form>
      </Modal>

      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title={t('routine_panel_edit_note_title')}>
          <form onSubmit={handleSaveNote}>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mb-4"
                rows={4}
                placeholder={t('routine_panel_note_placeholder')}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setIsNoteModalOpen(false)} className="bg-secondary px-4 py-2 rounded-lg">{t('common_cancel')}</button>
                  <button type="submit" className="bg-primary px-4 py-2 rounded-lg">{t('common_save')}</button>
              </div>
          </form>
      </Modal>
    </>
  );
};

export default RoutinePanel;