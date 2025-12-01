
import React, { useMemo, useState, useContext } from 'react';
import { SupplementPlan, SupplementPlanItem } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { getExplanationIdForSupplement } from '../../services/explanationService';
import Modal from '../common/Modal';
import { AppContext } from '../../contexts/AppContext';
import EditSupplementModal from './EditSupplementModal';
import AddSupplementModal from './AddSupplementModal';
import { TranslationKey } from '../../contexts/I18nContext';

// --- Library of Potential Supplements (Keys for translation) ---
const SUPPLEMENT_LIBRARY_DEF = [
    { key: 'supplements_name_creatine', category: 'supplements_category_performance', descriptionKey: 'supplements_desc_creatine', defaultDose: '5g', defaultTime: 'supplements_time_daily' },
    { key: 'supplements_name_whey', category: 'supplements_category_protein', descriptionKey: 'supplements_desc_whey', defaultDose: '30g', defaultTime: 'supplements_time_post_workout' },
    { key: 'supplements_name_caffeine', category: 'supplements_category_performance', descriptionKey: 'supplements_desc_caffeine', defaultDose: '200mg', defaultTime: 'supplements_time_pre_workout' },
    { key: 'supplements_name_multivitamin', category: 'supplements_category_health', descriptionKey: 'supplements_desc_multivitamin', defaultDose: '1 tablet', defaultTime: 'supplements_time_morning' },
    { key: 'supplements_name_omega_fish', category: 'supplements_category_health', descriptionKey: 'supplements_desc_omega', defaultDose: '2g', defaultTime: 'supplements_time_with_meal' },
    { key: 'supplements_name_vit_d3', category: 'supplements_category_health', descriptionKey: 'supplements_desc_vit_d3', defaultDose: '2000 IU', defaultTime: 'supplements_time_morning' },
    { key: 'supplements_name_magnesium', category: 'supplements_category_recovery', descriptionKey: 'supplements_desc_magnesium', defaultDose: '400mg', defaultTime: 'supplements_time_before_bed' },
    { key: 'supplements_name_zma', category: 'supplements_category_recovery', descriptionKey: 'supplements_desc_zma', defaultDose: '1 capsule', defaultTime: 'supplements_time_before_bed' },
    { key: 'supplements_name_bcaa', category: 'supplements_category_recovery', descriptionKey: 'supplements_desc_bcaa', defaultDose: '10g', defaultTime: 'supplements_time_intra_workout' },
    { key: 'supplements_name_beta_alanine', category: 'supplements_category_performance', descriptionKey: 'supplements_desc_beta_alanine', defaultDose: '3g', defaultTime: 'supplements_time_pre_workout' },
    { key: 'supplements_name_citrulline', category: 'supplements_category_performance', descriptionKey: 'supplements_desc_citrulline', defaultDose: '6g', defaultTime: 'supplements_time_pre_workout' },
    { key: 'supplements_name_glutamine', category: 'supplements_category_recovery', descriptionKey: 'supplements_desc_glutamine', defaultDose: '5g', defaultTime: 'supplements_time_post_workout' },
    { key: 'supplements_name_casein', category: 'supplements_category_protein', descriptionKey: 'supplements_desc_casein', defaultDose: '30g', defaultTime: 'supplements_time_before_bed' },
    { key: 'supplements_name_electrolytes', category: 'supplements_category_hydration', descriptionKey: 'supplements_desc_electrolytes', defaultDose: '1 serving', defaultTime: 'supplements_time_intra_workout' },
    { key: 'supplements_name_ashwagandha', category: 'supplements_category_health', descriptionKey: 'supplements_desc_ashwagandha', defaultDose: '600mg', defaultTime: 'supplements_time_evening' },
    { key: 'supplements_name_melatonin', category: 'supplements_category_recovery', descriptionKey: 'supplements_desc_melatonin', defaultDose: '3mg', defaultTime: 'supplements_time_before_bed' },
    { key: 'supplements_name_l_carnitine', category: 'supplements_category_fat_loss', descriptionKey: 'supplements_desc_l_carnitine', defaultDose: '2g', defaultTime: 'supplements_time_morning' },
    { key: 'supplements_name_collagen', category: 'supplements_category_health', descriptionKey: 'supplements_desc_collagen', defaultDose: '10g', defaultTime: 'supplements_time_daily' },
    { key: 'supplements_name_iron', category: 'supplements_category_health', descriptionKey: 'supplements_desc_iron', defaultDose: '1 tablet', defaultTime: 'supplements_time_morning' },
    { key: 'supplements_name_pre_workout_blend', category: 'supplements_category_performance', descriptionKey: 'supplements_desc_pre_workout', defaultDose: '1 scoop', defaultTime: 'supplements_time_pre_workout' },
];

interface SupplementPlanOverviewProps {
  plan: SupplementPlan | null;
  onRemoveItemRequest: (itemId: string) => void;
  onComplexRemoveRequest: (item: SupplementPlanItem) => void;
  onAddItemClick: () => void;
  onEditAnswers: () => void;
  onOpenExplanation: (id: string) => void;
  onReviewPlan?: () => void;
  onAddItem: (newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => void;
  onUpdateItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
  onRemoveItem: (itemId: string) => void;
}

const StockBadge: React.FC<{ item: SupplementPlanItem }> = ({ item }) => {
    const { t } = useI18n();
    const { updateSupplementStock } = useContext(AppContext);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [amountToAdd, setAmountToAdd] = useState('');

    if (item.stock === undefined) return null;

    const stock = item.stock;
    let bgColor = 'bg-green-500/20 text-green-400 border-green-500/30';
    if (stock <= 5) bgColor = 'bg-red-500/20 text-red-400 border-red-500/30';
    else if (stock <= 10) bgColor = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

    const handleRestock = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseInt(amountToAdd, 10);
        if (!isNaN(amount) && amount > 0) {
            updateSupplementStock(item.id, amount);
            setIsRestockModalOpen(false);
            setAmountToAdd('');
        }
    };

    return (
        <>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsRestockModalOpen(true); }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${bgColor} hover:brightness-110 transition-all`}
            >
                <Icon name="capsule" className="w-3 h-3" />
                {stock}
            </button>
            {isRestockModalOpen && (
                <Modal isOpen={isRestockModalOpen} onClose={() => setIsRestockModalOpen(false)} title={t('supplements_stock_update_title')}>
                    <form onSubmit={handleRestock} className="space-y-4">
                        <p className="text-text-secondary">{t('supplements_stock_restock_prompt', { supplement: item.supplement })}</p>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">{t('supplements_stock_add_amount')}</label>
                            <input
                                type="number"
                                value={amountToAdd}
                                onChange={(e) => setAmountToAdd(e.target.value)}
                                className="w-full bg-slate-900 border border-secondary/50 rounded-lg p-2 mt-1"
                                placeholder="30"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                             <button type="button" onClick={() => setIsRestockModalOpen(false)} className="bg-secondary px-4 py-2 rounded-lg">{t('common_cancel')}</button>
                             <button type="submit" className="bg-primary px-4 py-2 rounded-lg">{t('common_confirm')}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
};

const SupplementPlanOverview: React.FC<SupplementPlanOverviewProps> = ({ 
    plan, 
    onRemoveItemRequest, 
    onComplexRemoveRequest, 
    onEditAnswers, 
    onOpenExplanation, 
    onReviewPlan,
    onAddItem,
    onUpdateItem,
    onRemoveItem
}) => {
  const { t } = useI18n();
  const { userSupplements } = useContext(AppContext);
  const [itemToEdit, setItemToEdit] = useState<SupplementPlanItem | null>(null);
  const [itemToCopy, setItemToCopy] = useState<SupplementPlanItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Determine current stack items
  const activeItems = plan ? plan.plan : userSupplements;

  // 2. Build the unified list
  const unifiedList = useMemo(() => {
      const list = [];
      const activeNames = new Set<string>();
      const activeExplanationIds = new Set<string>();

      // Add Active Items
      activeItems.forEach(item => {
          list.push({
              type: 'active',
              id: item.id,
              name: item.supplement,
              data: item,
              category: null, // active items store category implicitly or could act as custom
              description: item.notes,
          });
          activeNames.add(item.supplement.toLowerCase().trim());
          
          const explanationId = getExplanationIdForSupplement(item.supplement);
          if (explanationId) {
              activeExplanationIds.add(explanationId);
          }
      });

      // Add Library Items (that are NOT in active list)
      SUPPLEMENT_LIBRARY_DEF.forEach(libItem => {
          const name = t(libItem.key as TranslationKey);
          
          // Check if this item is already active either by direct name match
          // OR by underlying explanation ID (e.g. "Creatine" vs "Creatine Monohydrate")
          // This aligns existing user history with new library items.
          const libExplanationId = getExplanationIdForSupplement(name);
          const isAlreadyActive = activeNames.has(name.toLowerCase().trim()) || (libExplanationId && activeExplanationIds.has(libExplanationId));

          if (!isAlreadyActive) {
              list.push({
                  type: 'library',
                  id: libItem.key,
                  name: name,
                  data: libItem,
                  category: t(libItem.category as TranslationKey),
                  description: t(libItem.descriptionKey as TranslationKey),
              });
          }
      });

      // Sort alphabetically
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeItems, t]);

  const filteredList = useMemo(() => {
      if (!searchTerm) return unifiedList;
      const lowerTerm = searchTerm.toLowerCase();
      return unifiedList.filter(item => item.name.toLowerCase().includes(lowerTerm));
  }, [unifiedList, searchTerm]);

  const handleEdit = (item: SupplementPlanItem) => {
      setItemToEdit(item);
  };

  const handleSaveEdit = (updates: Partial<SupplementPlanItem>) => {
      if (itemToEdit) {
          onUpdateItem(itemToEdit.id, updates);
          setItemToEdit(null);
      }
  };
  
  const handleAddLibraryItem = (libItem: any) => {
      const template: SupplementPlanItem = {
          id: '', 
          supplement: libItem.name,
          dosage: libItem.defaultDose,
          time: t(libItem.defaultTime as TranslationKey),
          notes: libItem.description || '',
          stock: 30,
          trainingDayOnly: false,
          restDayOnly: false,
          isCustom: true
      };
      setItemToCopy(template);
      setIsAddModalOpen(true);
  };

  const handleAddSubmit = (newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => {
    onAddItem(newItem);
    setItemToCopy(null);
    setIsAddModalOpen(false);
  };
  
  const handleRemoveClick = (item: SupplementPlanItem) => {
     if (item.trainingDayOnly || item.restDayOnly) {
        onRemoveItemRequest(item.id);
    } else {
        onComplexRemoveRequest(item);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Action Bar & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">{t('supplements_plan_subtitle')}</h3>
            <div className="flex gap-2">
                {onReviewPlan && (
                    <button onClick={onReviewPlan} className="bg-surface-highlight/80 hover:bg-surface-highlight text-text-primary font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-xs border border-white/10">
                        <Icon name="sparkles" className="w-4 h-4 text-yellow-400" />
                        <span>{t('supplements_review_plan')}</span>
                    </button>
                )}
                <button 
                    onClick={() => { setItemToCopy(null); setIsAddModalOpen(true); }}
                    className="bg-primary hover:bg-primary-content text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-xs shadow-md"
                >
                    <Icon name="plus" className="w-4 h-4" />
                    <span>{t('common_add')}</span>
                </button>
            </div>
        </div>
        
        <div className="relative">
            <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-text-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <Icon name="search" className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
        </div>
      </div>

      {/* Unified List */}
      <div className="space-y-2 animate-fadeIn">
        {filteredList.length > 0 ? filteredList.map((entry) => {
            if (entry.type === 'active') {
                const item = entry.data as SupplementPlanItem;
                return (
                    <div 
                        key={item.id} 
                        className="bg-surface/80 border border-primary/30 p-4 rounded-xl flex flex-col gap-2 hover:bg-surface transition-all shadow-sm"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-grow min-w-0 pr-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-base truncate text-white">
                                        {item.supplement}
                                    </h4>
                                    <StockBadge item={item} />
                                    {getExplanationIdForSupplement(item.supplement) && (
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                const id = getExplanationIdForSupplement(item.supplement);
                                                if (id) onOpenExplanation(id);
                                            }}
                                            className="text-text-secondary/60 hover:text-primary p-1"
                                        >
                                            <Icon name="question-mark-circle" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs text-text-secondary font-medium">{item.dosage} • <span className="text-primary/80">{item.time}</span></p>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {item.trainingDayOnly && <span className="text-[9px] font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">{t('supplements_frequency_training')}</span>}
                                        {item.restDayOnly && <span className="text-[9px] font-bold uppercase tracking-wide bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/30">{t('supplements_frequency_rest')}</span>}
                                    </div>
                                    {item.notes && <p className="text-xs text-text-secondary/50 italic mt-0.5 line-clamp-1">{item.notes}</p>}
                                </div>
                            </div>
                            
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => handleEdit(item)} className="p-2 text-primary hover:text-white rounded-lg hover:bg-white/5" title="Edit">
                                    <Icon name="edit" className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleRemoveClick(item)} className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10" title="Delete">
                                    <Icon name="trash" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            } else {
                const item = entry.data;
                return (
                    <div key={entry.id} className="bg-surface/30 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-surface/50 transition-colors group">
                        <div className="flex-grow pr-2 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-text-secondary group-hover:text-white transition-colors">{entry.name}</p>
                                {entry.category && <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wide text-text-secondary/70">{entry.category}</span>}
                            </div>
                            <p className="text-[10px] text-text-secondary/50 line-clamp-1 mt-0.5">{entry.description}</p>
                        </div>
                        <button 
                            onClick={() => handleAddLibraryItem({ ...item, name: entry.name, description: entry.description })}
                            className="bg-white/5 hover:bg-white/10 text-text-secondary hover:text-primary border border-white/10 font-bold py-1.5 px-3 rounded-lg text-xs transition-all flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                        >
                            <Icon name="plus" className="w-3 h-3" />
                            {t('supplements_add_to_plan')}
                        </button>
                    </div>
                );
            }
        }) : (
            <div className="text-center py-8 text-text-secondary/60 border-2 border-dashed border-white/5 rounded-xl">
                <Icon name="search" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('exercises_no_match')}</p>
            </div>
        )}
      </div>

      {/* Recalculate Button */}
      <div className="flex justify-center mt-8">
          <button 
              onClick={onEditAnswers}
              className="text-sm text-text-secondary hover:text-white underline decoration-white/20 hover:decoration-white transition-all"
          >
              {t('supplements_edit_plan')}
          </button>
      </div>

      {itemToEdit && (
        <EditSupplementModal
            isOpen={!!itemToEdit}
            onClose={() => setItemToEdit(null)}
            item={itemToEdit}
            onSave={handleSaveEdit}
            isGenerated={!itemToEdit.isCustom}
        />
      )}
      
      <AddSupplementModal 
            isOpen={isAddModalOpen}
            onClose={() => { setIsAddModalOpen(false); setItemToCopy(null); }}
            onAdd={handleAddSubmit}
            initialData={itemToCopy}
      />
    </div>
  );
};

export default SupplementPlanOverview;
