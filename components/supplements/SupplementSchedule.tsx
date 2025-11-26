
import React, { useState, useMemo, useContext, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import DailySupplementList from './DailySupplementList';
import SupplementPlanOverview from './SupplementPlanDisplay';
import AddSupplementModal from './AddSupplementModal';
import ConfirmModal from '../modals/ConfirmModal';
import { SupplementPlanItem } from '../../types';
import SupplementLog from './SupplementLog';
import SupplementExplanationModal from './SupplementExplanationModal';
import { generateSupplementExplanations, Explanation, getExplanationIdForSupplement } from '../../services/explanationService';
import { Icon } from '../common/Icon';
import DeleteSupplementModal from './DeleteSupplementModal';

const timeKeywords = {
    en: {
        morning: /morning|breakfast/i,
        pre_workout: /pre-workout/i,
        post_workout: /post-workout/i,
        with_meal: /meal/i,
        evening: /evening|bed/i,
    },
    es: {
        morning: /mañana|desayuno/i,
        pre_workout: /pre-entreno/i,
        post_workout: /post-entreno|post-entrenamiento/i,
        with_meal: /comida/i,
        evening: /noche|dormir/i,
    }
};

const timeOrder: { [key: string]: number } = {
    morning: 1,
    pre_workout: 2,
    post_workout: 3,
    with_meal: 4,
    evening: 5,
    daily: 6
};

interface SupplementScheduleProps {
  onEditAnswers: () => void;
  onReviewPlan?: () => void;
}

const SupplementSchedule: React.FC<SupplementScheduleProps> = ({ onEditAnswers, onReviewPlan }) => {
  const { supplementPlan, setSupplementPlan, userSupplements, setUserSupplements } = useContext(AppContext);
  const { t, locale } = useI18n();
  const [currentView, setCurrentView] = useState<'today' | 'tomorrow' | 'week' | 'log'>('today');
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

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);
  
  const getTimeKey = useCallback((time: string): string => {
    const keywords = timeKeywords[locale as keyof typeof timeKeywords];
    for (const key in keywords) {
        if (keywords[key as keyof typeof keywords].test(time)) {
            return key;
        }
    }
    return 'daily';
  }, [locale]);

  const handleOpenExplanation = (id?: string) => {
    if (!supplementPlan) return;
    const generatedExplanations = generateSupplementExplanations(supplementPlan, t);
    setExplanations(generatedExplanations);
    setExplanationIdToShow(id);
    setIsExplanationOpen(true);
  };

  const handleAddItem = (newItemData: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => {
    const newItem: SupplementPlanItem = {
        ...newItemData,
        id: `custom-${Date.now()}`,
        isCustom: true
    };
    
    const newCustomSupplements = [...userSupplements, newItem];
    setUserSupplements(newCustomSupplements);

    if (supplementPlan) {
        const newPlanItems = [...supplementPlan.plan, newItem].sort((a, b) => {
            const keyA = getTimeKey(a.time);
            const keyB = getTimeKey(b.time);
            return (timeOrder[keyA] || 99) - (timeOrder[keyB] || 99);
        });
        setSupplementPlan({ ...supplementPlan, plan: newPlanItems });
    }
    setIsAddModalOpen(false);
  };
  
  const handleRemoveItem = (itemId: string) => {
    if (!supplementPlan) return;
    const itemToRemove = supplementPlan.plan.find(p => p.id === itemId);
    if (!itemToRemove) return;

    const newPlanItems = supplementPlan.plan.filter(p => p.id !== itemId);
    setSupplementPlan({ ...supplementPlan, plan: newPlanItems });
    
    if (itemToRemove.isCustom) {
        setUserSupplements(userSupplements.filter(s => s.id !== itemId));
    }
  };

  const handleRequestRemoveItem = (itemId: string) => {
    setDeletingItemId(itemId);
  };

  const handleConfirmRemove = () => {
    if (deletingItemId) {
        handleRemoveItem(deletingItemId);
    }
    setDeletingItemId(null);
  };

  const handleRequestComplexRemove = (item: SupplementPlanItem) => {
    setDeletingItemWithOptions(item);
  };

  const updateItemDayType = (itemId: string, updates: { trainingDayOnly?: boolean; restDayOnly?: boolean }) => {
    if (!supplementPlan) return;
    
    const newPlanItems = supplementPlan.plan.map(p => {
        if (p.id === itemId) {
            const newItem = { ...p };
            delete newItem.trainingDayOnly;
            delete newItem.restDayOnly;
            return { ...newItem, ...updates };
        }
        return p;
    });

    const newPlan = { ...supplementPlan, plan: newPlanItems };
    setSupplementPlan(newPlan);

    if (userSupplements.some(s => s.id === itemId)) {
        setUserSupplements(prev => prev.map(s => {
            if (s.id === itemId) {
                const newCustomItem = { ...s };
                delete newCustomItem.trainingDayOnly;
                delete newCustomItem.restDayOnly;
                return { ...newCustomItem, ...updates };
            }
            return s;
        }));
    }
    setDeletingItemWithOptions(null);
  };

  const handleConsolidateEaaIntoProtein = () => {
    if (!supplementPlan) return;

    const combinedProteinName = t('supplements_name_protein_with_eaa');
    
    // 1. Find all separate EAA items to remove
    const eaaItems = supplementPlan.plan.filter(item => getExplanationIdForSupplement(item.supplement) === 'eaa');
    const eaaIds = new Set(eaaItems.map(i => i.id));

    // 2. Find all protein items to update
    const proteinItems = supplementPlan.plan.filter(item => getExplanationIdForSupplement(item.supplement) === 'protein');
    
    if (proteinItems.length === 0) return;

    // Update plan
    const newPlanItems = supplementPlan.plan
        .filter(item => !eaaIds.has(item.id)) // Remove EAAs
        .map(item => {
            if (getExplanationIdForSupplement(item.supplement) === 'protein') {
                return { ...item, supplement: combinedProteinName };
            }
            return item;
        });

    setSupplementPlan({ ...supplementPlan, plan: newPlanItems });

    // Update custom supplements if they were custom
    // If protein was generated but now user overrides, we probably don't need to add to customSupplements unless we want persistence.
    // However, if EAA was custom, remove it from userSupplements.
    const proteinIds = new Set(proteinItems.map(i => i.id));
    
    const newUserSupplements = userSupplements
        .filter(item => !eaaIds.has(item.id))
        .map(item => {
            if (proteinIds.has(item.id) || getExplanationIdForSupplement(item.supplement) === 'protein') {
                 return { ...item, supplement: combinedProteinName };
            }
            return item;
        });
    
    setUserSupplements(newUserSupplements);
  };

  const handleSetTrainingOnly = () => {
    if (!deletingItemWithOptions) return;
    updateItemDayType(deletingItemWithOptions.id, { trainingDayOnly: true });
  };

  const handleSetRestOnly = () => {
    if (!deletingItemWithOptions) return;
    updateItemDayType(deletingItemWithOptions.id, { restDayOnly: true });
  };

  const handleRemoveCompletely = () => {
    if (!deletingItemWithOptions) return;
    handleRemoveItem(deletingItemWithOptions.id);
    setDeletingItemWithOptions(null);
  };

  const renderView = () => {
    if (!supplementPlan) return null;
    switch(currentView) {
      case 'today':
        return <DailySupplementList date={today} onOpenExplanation={handleOpenExplanation} />;
      case 'tomorrow':
        return <DailySupplementList date={tomorrow} readOnly={true} onOpenExplanation={handleOpenExplanation} />;
      case 'week':
        return <SupplementPlanOverview 
          plan={supplementPlan} 
          onRemoveItemRequest={handleRequestRemoveItem} 
          onComplexRemoveRequest={handleRequestComplexRemove}
          onAddItemClick={() => setIsAddModalOpen(true)}
          onEditAnswers={onEditAnswers}
          onOpenExplanation={handleOpenExplanation}
          onReviewPlan={onReviewPlan}
        />;
      case 'log':
        return <SupplementLog />;
    }
  };
  
  const tabs: {id: 'today' | 'tomorrow' | 'week' | 'log', label: string}[] = [
      { id: 'today', label: t('supplements_tab_today') },
      { id: 'tomorrow', label: t('supplements_tab_tomorrow') },
      { id: 'week', label: t('supplements_tab_week') },
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

        <div className="mt-4">
            {renderView()}
        </div>

        <AddSupplementModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItem}
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
