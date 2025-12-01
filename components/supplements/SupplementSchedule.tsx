
import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import DailySupplementList from './DailySupplementList';
import SupplementPlanOverview from './SupplementPlanDisplay';
import AddSupplementModal from './AddSupplementModal';
import ConfirmModal from '../modals/ConfirmModal';
import { SupplementPlanItem } from '../../types';
import SupplementLog from './SupplementLog';
import SupplementExplanationModal from './SupplementExplanationModal';
import { generateSupplementExplanations, Explanation } from '../../services/explanationService';
import { Icon } from '../common/Icon';
import DeleteSupplementModal from './DeleteSupplementModal';
import { getEffectiveDate } from '../../utils/timeUtils';

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface SupplementScheduleProps {
  onEditAnswers: () => void;
  onReviewPlan?: () => void;
  onAddItem: (newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => void;
  onUpdateItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
  onRemoveItem: (itemId: string) => void;
}

const SupplementSchedule: React.FC<SupplementScheduleProps> = ({ onEditAnswers, onReviewPlan, onAddItem, onUpdateItem, onRemoveItem }) => {
  const { supplementPlan } = useContext(AppContext);
  const { t } = useI18n();
  const [currentView, setCurrentView] = useState<'today' | 'manage' | 'log'>('today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingItemWithOptions, setDeletingItemWithOptions] = useState<SupplementPlanItem | null>(null);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [explanationIdToShow, setExplanationIdToShow] = useState<string | undefined>(undefined);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  
  const itemToDelete = useMemo(() => {
    if (!deletingItemId || !supplementPlan) return null;
    return supplementPlan.plan.find(item => item.id === deletingItemId);
  }, [deletingItemId, supplementPlan]);

  // Calculate dates based on effective date for night owls
  const effectiveToday = useMemo(() => getEffectiveDate(), []);
  
  // Determine Tomorrow's Info
  const tomorrowInfo = useMemo(() => {
      const d = new Date(effectiveToday);
      d.setDate(d.getDate() + 1);
      const dayIndex = d.getDay();
      const dayNameFull = daysOfWeek[dayIndex];
      const dayName = t(`supplements_day_${dayNameFull.slice(0, 3)}_short` as any);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const isTraining = supplementPlan?.info?.trainingDays?.includes(dayNameFull);
      const type = isTraining ? t('supplements_workout_day') : t('supplements_rest_day');
      
      return `${t('supplements_tab_tomorrow')}, ${dayName} ${dateStr} • ${type}`;
  }, [effectiveToday, supplementPlan, t]);

  // Determine Today's Info
  const todayInfo = useMemo(() => {
      const d = new Date(effectiveToday);
      const dayIndex = d.getDay();
      const dayNameFull = daysOfWeek[dayIndex];
      const isTraining = supplementPlan?.info?.trainingDays?.includes(dayNameFull);
      return { isTraining };
  }, [effectiveToday, supplementPlan]);
  
  const handleOpenExplanation = (id?: string) => {
    if (!supplementPlan) return;
    const generatedExplanations = generateSupplementExplanations(supplementPlan, t);
    setExplanations(generatedExplanations);
    setExplanationIdToShow(id);
    setIsExplanationOpen(true);
  };

  // Wrapper to add locally then close modal
  const handleAddItemWrapper = (newItemData: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => {
      onAddItem(newItemData);
      setIsAddModalOpen(false);
  }
  
  // Wrapper to remove item using the prop
  const handleRemoveItemWrapper = (itemId: string) => {
    onRemoveItem(itemId);
  };

  const handleRequestRemoveItem = (itemId: string) => {
    setDeletingItemId(itemId);
  };

  const handleConfirmRemove = () => {
    if (deletingItemId) {
        handleRemoveItemWrapper(deletingItemId);
    }
    setDeletingItemId(null);
  };

  const handleRequestComplexRemove = (item: SupplementPlanItem) => {
    setDeletingItemWithOptions(item);
  };

  const handleConsolidateEaaIntoProtein = () => {
     // Kept for compatibility with existing flow, though primarily handled via suggestions now
  };

  const handleSetTrainingOnly = () => {
    if (!deletingItemWithOptions) return;
    onUpdateItem(deletingItemWithOptions.id, { trainingDayOnly: true, restDayOnly: false });
    setDeletingItemWithOptions(null);
  };

  const handleSetRestOnly = () => {
    if (!deletingItemWithOptions) return;
    onUpdateItem(deletingItemWithOptions.id, { restDayOnly: true, trainingDayOnly: false });
    setDeletingItemWithOptions(null);
  };

  const handleRemoveCompletely = () => {
    if (!deletingItemWithOptions) return;
    handleRemoveItemWrapper(deletingItemWithOptions.id);
    setDeletingItemWithOptions(null);
  };

  const renderView = () => {
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };

    switch(currentView) {
      case 'today':
        return <DailySupplementList 
            date={effectiveToday} 
            subTitle={effectiveToday.toLocaleDateString(undefined, dateOptions)}
            onOpenExplanation={handleOpenExplanation} 
        />;
      case 'manage':
        return <SupplementPlanOverview 
          plan={supplementPlan} 
          onRemoveItemRequest={handleRequestRemoveItem} 
          onComplexRemoveRequest={handleRequestComplexRemove}
          onAddItemClick={() => setIsAddModalOpen(true)}
          onEditAnswers={onEditAnswers}
          onOpenExplanation={handleOpenExplanation}
          onReviewPlan={onReviewPlan}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onRemoveItem={onRemoveItem}
        />;
      case 'log':
        return <SupplementLog />;
    }
  };
  
  const tabs: {id: 'today' | 'manage' | 'log', label: string}[] = [
      { id: 'today', label: t('supplements_tab_today') },
      { id: 'manage', label: t('nav_supplements') },
      { id: 'log', label: t('supplements_tab_log') },
  ];

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{t('supplements_title')}</h1>
                <button onClick={() => handleOpenExplanation()} className="text-text-secondary hover:text-primary" aria-label={t('supplements_about_plan')}>
                    <Icon name="question-mark-circle" className="w-6 h-6" />
                </button>
            </div>
        </div>
        
        <div className="flex justify-center border-b border-secondary/20">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setCurrentView(tab.id)}
                    className={`px-4 py-2 font-medium ${currentView === tab.id ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Status Card for Today with Tomorrow Subtitle */}
        {currentView === 'today' && (
          <div className="text-center p-4 bg-surface rounded-xl shadow-sm border border-white/5">
              <p className={`font-bold text-xl ${todayInfo.isTraining ? 'text-primary' : 'text-text-secondary'}`}>
                {todayInfo.isTraining ? t('supplements_workout_day') : t('supplements_rest_day')}
              </p>
              <p className="text-xs text-text-secondary/60 mt-1.5 font-medium uppercase tracking-wide opacity-80">
                {tomorrowInfo}
              </p>
          </div>
        )}

        <div className="mt-4">
            {renderView()}
        </div>

        <AddSupplementModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItemWrapper}
        />
        {itemToDelete && (
            <ConfirmModal
              isOpen={!!itemToDelete}
              onClose={() => setDeletingItemId(null)}
              onConfirm={handleConfirmRemove}
              title={t('supplements_delete_confirm_title')}
              message={t('supplements_delete_confirm_message', { supplementName: itemToDelete.supplement })}
              confirmText={t('common_delete')}
              confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        )}
        {deletingItemWithOptions && (
            <DeleteSupplementModal
                isOpen={!!deletingItemWithOptions}
                onClose={() => setDeletingItemWithOptions(null)}
                item={deletingItemWithOptions}
                onSetTrainingOnly={handleSetTrainingOnly}
                onSetRestOnly={handleSetRestOnly}
                onRemoveCompletely={handleRemoveCompletely}
            />
        )}
        <SupplementExplanationModal 
            isOpen={isExplanationOpen}
            onClose={() => setIsExplanationOpen(false)}
            explanations={explanations}
            explanationIdToShow={explanationIdToShow}
            onConsolidateEaa={handleConsolidateEaaIntoProtein}
        />
    </div>
  );
};

export default SupplementSchedule;
