
import React, { useState, useMemo, useContext } from 'react';
import { Exercise } from '../../types';
import Modal from '../common/Modal';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { getExerciseHistory, calculateRecords } from '../../utils/workoutUtils';
import { getBodyPartTKey, getCategoryTKey } from '../../utils/i18nUtils';

import DescriptionTab from './DescriptionTab';
import HistoryTab from './HistoryTab';
import GraphsTab from './GraphsTab';
import RecordsTab from './RecordsTab';
import { getBodyPartColor, getCategoryColor } from '../../utils/colorUtils';
import { useExerciseName } from '../../hooks/useExerciseName';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  isOpen: boolean;
  onClose: () => void;
  onSelectForAdd?: (exerciseId: string) => void;
  onAddAndClose?: (exerciseId: string) => void;
  onExerciseCreated?: (createdExercise: Exercise) => void;
}

type Tab = 'description' | 'history' | 'graphs' | 'records';

const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({ exercise, isOpen, onClose, onSelectForAdd, onAddAndClose, onExerciseCreated }) => {
  const { t } = useI18n();
  const { history: allHistory, startExerciseEdit, startExerciseDuplicate } = useContext(AppContext);
  const getExerciseName = useExerciseName();
  const [activeTab, setActiveTab] = useState<Tab>('description');

  const exerciseHistory = useMemo(() => getExerciseHistory(allHistory, exercise.id), [allHistory, exercise.id]);
  const personalRecords = useMemo(() => calculateRecords(exerciseHistory), [exerciseHistory]);
  
  const TABS: { id: Tab; label: string }[] = [
    { id: 'description', label: t('tab_description') },
    { id: 'history', label: t('tab_history') },
    { id: 'graphs', label: t('tab_graphs') },
    { id: 'records', label: t('tab_records') },
  ];
  
  const renderTabContent = () => {
    switch(activeTab) {
      case 'description': return <DescriptionTab exercise={exercise} />;
      case 'history': return <HistoryTab history={exerciseHistory} />;
      case 'graphs': return <GraphsTab exercise={exercise} history={exerciseHistory} />;
      case 'records': return <RecordsTab records={personalRecords} exerciseId={exercise.id} />;
      default: return null;
    }
  }

  const handleEdit = () => {
    startExerciseEdit(exercise);
    onClose();
  };

  const handleDuplicate = () => {
    startExerciseDuplicate(exercise, onExerciseCreated);
    onClose();
  };

  const handleSelectForAdd = () => {
    onSelectForAdd?.(exercise.id);
  };

  const handleAddAndClose = () => {
    onAddAndClose?.(exercise.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} contentClassName="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-xl m-4 p-0 flex flex-col h-[85vh] max-h-[750px] border border-white/10 overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Custom Header */}
        <div className="bg-[#0f172a] p-5 pb-0 flex-shrink-0 relative z-10">
            <div className="flex justify-between items-start mb-2">
                 <button onClick={onClose} className="p-2 -ml-2 -mt-2 rounded-full text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
                    <Icon name="x" className="w-6 h-6" />
                </button>
                <div className="flex items-center space-x-1 -mt-1 -mr-2">
                    <button onClick={handleDuplicate} className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Duplicate">
                        <Icon name="duplicate" className="w-5 h-5" />
                    </button>
                    <button onClick={handleEdit} className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-full transition-colors" title={t('exercise_edit')}>
                        <Icon name="edit" className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="text-center px-2 mb-4">
                <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                    {getExerciseName(exercise)}
                </h2>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/5 uppercase tracking-wide ${getBodyPartColor(exercise.bodyPart)}`}>
                        {t(getBodyPartTKey(exercise.bodyPart))}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/5 uppercase tracking-wide ${getCategoryColor(exercise.category)}`}>
                        {t(getCategoryTKey(exercise.category))}
                    </span>
                    {exercise.isTimed && (
                        <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 uppercase tracking-wide">
                            <Icon name="stopwatch" className="w-3 h-3" />
                            <span>{t('set_type_timed')}</span>
                        </span>
                    )}
                </div>
            </div>
            
            {/* Segmented Control Tabs */}
            <div className="bg-surface-highlight/40 p-1 rounded-xl flex mt-2 mb-4 border border-white/5">
                {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                        ? 'bg-primary text-white shadow-md'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                >
                    {tab.label}
                </button>
                ))}
            </div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-grow overflow-y-auto px-5 pb-5 bg-gradient-to-b from-[#0f172a] to-[#0b1120]" style={{ overscrollBehaviorY: 'contain' }}>
            {renderTabContent()}
        </div>

        {/* Conditional Footer */}
        {(onSelectForAdd || onAddAndClose) && (
            <div className="flex-shrink-0 p-4 bg-[#0f172a] border-t border-white/10 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-20 safe-area-bottom">
                {onSelectForAdd && (
                    <button 
                        onClick={handleSelectForAdd}
                        className="flex-1 bg-surface hover:bg-surface-highlight text-white font-bold py-3.5 rounded-xl transition-colors border border-white/10"
                    >
                        {t('common_select')}
                    </button>
                )}
                {onAddAndClose && (
                    <button
                        onClick={handleAddAndClose}
                        className="flex-1 bg-primary hover:bg-primary-content text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-primary/20"
                    >
                        {t('common_add_and_close')}
                    </button>
                )}
            </div>
        )}
      </div>
    </Modal>
  );
};

export default ExerciseDetailModal;
