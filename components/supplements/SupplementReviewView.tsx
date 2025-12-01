import React, { useState, useMemo } from 'react';
import { SupplementSuggestion, WorkoutSession, SupplementPlanItem } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { SupplementCorrelation, analyzeCorrelations } from '../../services/analyticsService';
import AddSupplementModal from './AddSupplementModal';
import EditSupplementModal from './EditSupplementModal';

interface SupplementReviewViewProps {
    onBack: () => void;
    suggestions: SupplementSuggestion[];
    history: WorkoutSession[];
    takenSupplements: Record<string, string[]>;
    allSupplements: SupplementPlanItem[];
    onApply: (suggestionId: string) => void;
    onApplyAll: () => void;
    onDismiss: (suggestionId: string) => void;
    onDismissAll: () => void;
    onRecalculate: () => void;
    onAddItem: (newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => void;
    onUpdateItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
    onRemoveItem: (itemId: string) => void;
}

const InsightCard: React.FC<{ insight: SupplementCorrelation }> = ({ insight }) => {
    const { t } = useI18n();
    const isPositive = insight.differencePercentage > 0;
    const isNeutral = insight.differencePercentage === 0;
    
    let colorClass = 'text-text-secondary';
    let bgClass = 'bg-surface';
    
    if (isPositive) {
      colorClass = 'text-success';
      bgClass = 'bg-green-500/10 border-green-500/20';
    } else if (!isNeutral) {
      colorClass = 'text-red-400';
      bgClass = 'bg-red-500/10 border-red-500/20';
    }
  
    return (
      <div className={`p-4 rounded-xl border border-white/5 flex items-start gap-4 ${bgClass}`}>
        <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/20' : (!isNeutral ? 'bg-red-500/20' : 'bg-slate-700')} flex-shrink-0`}>
            <Icon name="chart-line" className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div className="flex-grow">
            <h4 className="font-bold text-lg text-text-primary">{insight.supplementName}</h4>
            <div className="flex items-center gap-2 my-1">
                <span className={`text-xl font-bold ${colorClass}`}>
                  {isPositive ? '+' : ''}{insight.differencePercentage}%
                </span>
                <span className="text-sm text-text-secondary font-medium">
                    {insight.metric === 'volume' ? t('insights_volume_impact') : t('insights_pr_impact')}
                </span>
            </div>
            <p className="text-xs text-text-secondary/70 mt-2">
                {t('insights_sample_size', { on: insight.sampleSizeOn, off: insight.sampleSizeOff })}
            </p>
        </div>
      </div>
    );
  };

const SupplementReviewView: React.FC<SupplementReviewViewProps> = ({ 
    onBack, 
    suggestions, 
    history, 
    takenSupplements, 
    allSupplements,
    onApply, 
    onApplyAll, 
    onDismiss, 
    onDismissAll,
    onRecalculate,
    onAddItem,
    onUpdateItem,
    onRemoveItem
}) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'suggestions' | 'analysis' | 'manage'>('suggestions');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<SupplementPlanItem | null>(null);
    // State for copy pre-fill
    const [itemToCopy, setItemToCopy] = useState<SupplementPlanItem | null>(null);

    const insights = useMemo(() => {
        return analyzeCorrelations(history, takenSupplements, allSupplements);
    }, [history, takenSupplements, allSupplements]);

    const handleCopy = (item: SupplementPlanItem) => {
        setItemToCopy(item);
        setIsAddModalOpen(true);
    };

    const handleAddSubmit = (newItem: Omit<SupplementPlanItem, 'id' | 'isCustom'>) => {
        onAddItem(newItem);
        setItemToCopy(null);
        setIsAddModalOpen(false);
    };

    const handleEditSubmit = (updates: Partial<SupplementPlanItem>) => {
        if (itemToEdit) {
            onUpdateItem(itemToEdit.id, updates);
            setItemToEdit(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b border-white/10 bg-surface z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-white/5 transition-colors text-text-secondary hover:text-white">
                    <Icon name="arrow-right" className="w-6 h-6 rotate-180" />
                </button>
                <h2 className="text-xl font-bold text-white">{t('supplements_review_plan')}</h2>
            </div>

            {/* Tabs */}
            <div className="flex justify-center border-b border-white/10 bg-surface/50">
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`flex-1 py-3 font-medium transition-colors relative ${activeTab === 'suggestions' ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
                >
                    {t('supplements_tab_suggestions')}
                    {suggestions.length > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
                    )}
                    {activeTab === 'suggestions' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('manage')}
                    className={`flex-1 py-3 font-medium transition-colors relative ${activeTab === 'manage' ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
                >
                    Supplements
                    {activeTab === 'manage' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-3 font-medium transition-colors relative ${activeTab === 'analysis' ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
                >
                    {t('supplements_tab_analysis')}
                    {activeTab === 'analysis' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                </button>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4 pb-24 space-y-6">
                {activeTab === 'suggestions' && (
                    <>
                        <div className="text-center p-3 bg-slate-900/50 rounded-lg mb-4">
                            <h3 className="font-semibold text-text-primary">{t('supplements_review_analysis_title')}</h3>
                        </div>

                        <div className="mb-6">
                             <div className="bg-surface p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                 <div>
                                     <h4 className="font-bold text-white">{t('supplements_recalculate_plan')}</h4>
                                     <p className="text-xs text-text-secondary">{t('supplements_recalculate_desc')}</p>
                                 </div>
                                 <button 
                                    onClick={onRecalculate}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-lg"
                                >
                                    Recalculate
                                </button>
                             </div>
                        </div>

                        {suggestions.length > 0 ? (
                            <div className="space-y-4">
                                {suggestions.map(suggestion => (
                                    <div key={suggestion.id} className="bg-surface border border-secondary/20 p-5 rounded-xl shadow-sm">
                                        <h4 className="font-bold text-lg text-primary mb-2">{suggestion.title}</h4>
                                        <p className="text-sm text-text-secondary mb-4 leading-relaxed">{suggestion.reason}</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => onApply(suggestion.id)} className="flex-1 bg-primary/80 hover:bg-primary text-white font-bold py-3 px-4 rounded-lg text-sm shadow-sm transition-colors">
                                                {t('supplements_review_apply')}
                                            </button>
                                            <button onClick={() => onDismiss(suggestion.id)} className="flex-1 bg-secondary/10 hover:bg-secondary/20 text-text-secondary font-bold py-3 px-4 rounded-lg text-sm transition-colors">
                                                {t('supplements_review_dismiss_one')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center">
                                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                                    <Icon name="check" className="w-8 h-8 text-success" />
                                </div>
                                <p className="text-text-secondary text-lg font-medium">{t('supplements_review_no_suggestions')}</p>
                            </div>
                        )}
                    </>
                )}
                
                {activeTab === 'manage' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-white">Your Stack</h3>
                            <button 
                                onClick={() => { setItemToCopy(null); setIsAddModalOpen(true); }}
                                className="bg-primary hover:bg-primary-content text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                                {t('supplements_manage_add')}
                            </button>
                        </div>
                        
                        {allSupplements.length === 0 ? (
                             <p className="text-center text-text-secondary py-10">No supplements in your plan.</p>
                        ) : (
                            <div className="space-y-3">
                                {allSupplements.map(item => (
                                    <div key={item.id} className="bg-surface border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{item.supplement}</h4>
                                                <p className="text-sm text-text-secondary">{item.dosage} • {item.time}</p>
                                                <div className="flex gap-2 mt-1">
                                                    {item.trainingDayOnly && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">Training Only</span>}
                                                    {item.restDayOnly && <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30">Rest Only</span>}
                                                    {!item.isCustom && <span className="text-[10px] bg-white/5 text-text-secondary px-2 py-0.5 rounded border border-white/10">Generated</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleCopy(item)} className="p-2 text-text-secondary hover:text-white rounded-lg hover:bg-white/5" title={t('supplements_manage_copy')}>
                                                    <Icon name="duplicate" className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setItemToEdit(item)} className="p-2 text-primary hover:text-white rounded-lg hover:bg-white/5" title="Edit">
                                                    <Icon name="edit" className="w-5 h-5" />
                                                </button>
                                                {item.isCustom && (
                                                    <button onClick={() => onRemoveItem(item.id)} className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10" title="Delete">
                                                        <Icon name="trash" className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {item.notes && <p className="text-xs text-text-secondary/70 italic">{item.notes}</p>}
                                        {item.stock !== undefined && (
                                            <div className="text-xs font-mono text-text-secondary mt-1">
                                                Stock: <span className={item.stock <= 5 ? "text-red-400 font-bold" : "text-white"}>{item.stock}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <div className="space-y-6">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-sm text-indigo-200 flex items-start gap-3">
                            <Icon name="question-mark-circle" className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>{t('insights_correlation_explanation')}</p>
                        </div>
                        
                        {insights.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {insights.map(insight => (
                                    <InsightCard key={`${insight.supplementId}-${insight.metric}`} insight={insight} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-text-secondary bg-surface/30 rounded-xl border border-white/5">
                                <Icon name="chart-line" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">{t('insights_no_supplement_data')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions (Only for Suggestions tab) */}
            {activeTab === 'suggestions' && (
                <div className="p-4 border-t border-white/10 bg-surface z-10 flex flex-col sm:flex-row gap-3 safe-area-bottom">
                     <button onClick={onDismissAll} className="w-full bg-secondary/20 hover:bg-secondary/30 text-text-secondary font-bold py-3 rounded-xl transition-colors">
                        {suggestions.length > 0 ? t('supplements_review_dismiss_all') : t('supplements_review_dismiss')}
                    </button>
                    {suggestions.length > 0 && (
                        <button
                            onClick={onApplyAll}
                            className="w-full bg-success hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-success/20 transition-colors"
                        >
                            {t('supplements_review_apply_all')}
                        </button>
                    )}
                </div>
            )}

            <AddSupplementModal 
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); setItemToCopy(null); }}
                onAdd={handleAddSubmit}
                initialData={itemToCopy}
            />
            
            {itemToEdit && (
                <EditSupplementModal
                    isOpen={!!itemToEdit}
                    onClose={() => setItemToEdit(null)}
                    item={itemToEdit}
                    onSave={handleEditSubmit}
                    isGenerated={!itemToEdit.isCustom}
                />
            )}
        </div>
    );
};

export default SupplementReviewView;