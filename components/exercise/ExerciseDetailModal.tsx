import React, { useState, useMemo, useContext } from 'react';
import { Exercise } from '../../types';
import Modal from '../common/Modal';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { getExerciseHistory, calculateRecords } from '../../utils/workoutUtils';

import DescriptionTab from './DescriptionTab';
import HistoryTab from './HistoryTab';
import GraphsTab from './GraphsTab';
import RecordsTab from './RecordsTab';

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
      case 'records': return <RecordsTab records={personalRecords} />;
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-[70vh] max-h-[550px]">
        {/* Custom Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-1 sm:gap-2">
            <div className="flex-shrink-0">
                <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1">
                    <Icon name="x" className="w-6 h-6" />
                </button>
            </div>
            <h2 className="font-bold text-text-primary text-center flex-grow min-w-0 text-base sm:text-xl">
                {exercise.name}
            </h2>
            <div className="flex-shrink-0 flex items-center space-x-1">
                <button onClick={handleDuplicate} className="text-text-secondary hover:text-text-primary flex items-center space-x-1 p-1" title="Duplicate">
                    <Icon name="duplicate" className="w-5 h-5" />
                </button>
                <button onClick={handleEdit} className="text-text-secondary hover:text-text-primary flex items-center space-x-1 p-1" title={t('exercise_edit')}>
                    <Icon name="edit" className="w-5 h-5" />
                </button>
            </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-secondary/20 mb-4 flex-shrink-0">
          <nav className="flex" aria-label="Tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-1 text-center font-medium text-xs sm:text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-600'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-grow overflow-y-auto pr-2">
            {renderTabContent()}
        </div>

        {/* Conditional Footer */}
        {(onSelectForAdd || onAddAndClose) && (
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-secondary/20 flex flex-col sm:flex-row gap-3">
                {onSelectForAdd && (
                    <button 
                        onClick={handleSelectForAdd}
                        className="w-full bg-secondary text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        {t('common_select')}
                    </button>
                )}
                {onAddAndClose && (
                    <button
                        onClick={handleAddAndClose}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors"
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