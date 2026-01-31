
import React, { useState, useEffect, useContext } from 'react';
import { SupplementPlanItem } from '../../types';
import { TranslationKey } from '../../contexts/I18nContext';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';

interface SupplementActionCardProps {
    items: SupplementPlanItem[];
    title: string;
    onLog: (itemIds: string[]) => void;
    onSnoozeAll: () => void;
    isCompact?: boolean;
    onExpand?: () => void;
}

const SupplementActionCard: React.FC<SupplementActionCardProps> = ({ items, title, onLog, onSnoozeAll, isCompact, onExpand }) => {
    const { t } = useI18n();
    const { logRecommendationLog } = useContext(AppContext);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Helper for logging
    const logAction = (action: string, value?: any) => {
        logRecommendationLog({
            id: `supp-${Date.now()}`,
            type: 'supplement',
            timestamp: Date.now(),
            title: title,
            reason: items.map(i => i.supplement).join(', '),
            variables: {
                itemCount: items.length,
                items: items.map(i => i.supplement).join('|')
            },
            actionTaken: action as any,
            appliedValue: value
        });
    };

    // Reset selection when items change significantly (e.g. different time of day)
    useEffect(() => {
        setSelectedIds(items.map(i => i.id));
    }, [items]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    const handleLog = () => {
        if (selectedIds.length > 0) {
            logAction('take', { itemIds: selectedIds });
            onLog(selectedIds);
        }
    };

    if (items.length === 0) return null;

    if (isCompact) {
        return (
            <button
                onClick={onExpand}
                className="bg-gradient-to-r from-sky-900/80 to-blue-900/80 border border-sky-500/30 rounded-2xl p-4 shadow-md transition-all active:scale-[0.98] w-full h-full text-left relative overflow-hidden group"
            >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col h-full justify-between gap-1 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                            <Icon name="capsule" className="w-4 h-4 text-sky-300" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                            {t('supplement_stack_title' as TranslationKey)}
                        </span>
                    </div>
                    <div className="mt-1">
                        <h3 className="text-sm font-bold text-white leading-tight">
                            {title}
                        </h3>
                        <p className="text-[10px] text-sky-200/60 mt-0.5 line-clamp-1">
                            {items.map(i => i.supplement).join(', ')}
                        </p>
                    </div>
                </div>
            </button>
        );
    }
    return (
        <div className="bg-gradient-to-r from-sky-900/80 to-blue-900/80 border border-sky-500/30 rounded-2xl p-5 mb-6 shadow-lg animate-fadeIn overflow-hidden relative">
            {/* Decorative glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2.5">
                        <div className="bg-white/10 p-1.5 rounded-lg">
                            <Icon name="capsule" className="w-5 h-5 text-sky-300" />
                        </div>
                        {title}
                    </h3>
                </div>

                <div className="space-y-2 mb-5">
                    {items.map(item => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleToggle(item.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group text-left ${isSelected
                                    ? 'bg-white/10 border-white/20'
                                    : 'bg-black/20 border-transparent opacity-70 hover:opacity-100'
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-sky-400 border-sky-400' : 'border-sky-400/50 group-hover:border-sky-400'}`}>
                                        {isSelected && <Icon name="check" className="w-3 h-3 text-black stroke-[4]" />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-sky-100/70'}`}>
                                            {item.supplement}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-xs font-mono flex-shrink-0 ml-2 ${isSelected ? 'text-sky-200' : 'text-sky-200/50'}`}>
                                    {item.dosage}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            logAction('snooze');
                            onSnoozeAll();
                        }}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-sky-200 text-sm font-semibold py-3 rounded-xl transition-colors border border-white/5"
                    >
                        {t('supplement_snooze_all')}
                    </button>
                    <button
                        onClick={handleLog}
                        disabled={selectedIds.length === 0}
                        className="flex-[2] bg-white text-sky-900 hover:bg-sky-50 text-sm font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Icon name="check" className="w-4 h-4" />
                        <span>{t('supplement_log_action', { count: selectedIds.length })}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupplementActionCard;
