import React, { useState, useMemo, useContext, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import DailySupplementList from './DailySupplementList';
import SupplementPlanOverview from './SupplementPlanDisplay';
import AddSupplementModal from './AddSupplementModal';
import ConfirmModal from '../modals/ConfirmModal';
import { SupplementPlanItem } from '../../types';
import SupplementLog from './SupplementLog';

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
}

const SupplementSchedule: React.FC<SupplementScheduleProps> = ({ onEditAnswers }) => {
  const { supplementPlan, setSupplementPlan, userSupplements, setUserSupplements } = useContext(AppContext);
  const { t, locale } = useI18n();
  const [currentView, setCurrentView] = useState<'today' | 'tomorrow' | 'week' | 'log'>('today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
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

  const renderView = () => {
    if (!supplementPlan) return null;
    switch(currentView) {
      case 'today':
        return <DailySupplementList date={today} />;
      case 'tomorrow':
        return <DailySupplementList date={tomorrow} readOnly={true} />;
      case 'week':
        return <SupplementPlanOverview 
          plan={supplementPlan} 
          onRemoveItemRequest={handleRequestRemoveItem} 
          onAddItemClick={() => setIsAddModalOpen(true)}
          onEditAnswers={onEditAnswers}
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
            <div>
                <h1 className="text-3xl font-bold">{t('supplements_title')}</h1>
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
    </div>
  );
};

export default SupplementSchedule;