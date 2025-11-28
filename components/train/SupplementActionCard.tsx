
import React from 'react';
import { SupplementPlanItem } from '../../types';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';

interface SupplementActionCardProps {
  items: SupplementPlanItem[];
  timeLabel: string;
  onTake: (itemId: string) => void;
  onSnooze: (itemId: string) => void;
}

const SupplementActionCard: React.FC<SupplementActionCardProps> = ({ items, timeLabel, onTake, onSnooze }) => {
  const { t } = useI18n();
  if (items.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-sky-900/80 to-blue-900/80 border border-sky-500/30 rounded-xl p-4 mb-6 shadow-lg animate-fadeIn">
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
                <Icon name="capsule" className="w-5 h-5 text-sky-300" />
                {t('supplement_action_card_title', { time: timeLabel })}
            </h3>
        </div>
        <div className="space-y-3">
            {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{item.supplement}</span>
                        <span className="text-xs text-sky-200/70">{item.dosage} • {item.time}</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onSnooze(item.id)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-sky-200 transition-colors"
                            title="Snooze for 1 hour"
                        >
                            <Icon name="history" className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => onTake(item.id)}
                            className="p-2 bg-success hover:bg-green-500 rounded-lg text-white shadow-md transition-colors"
                            title="Mark as Taken"
                        >
                            <Icon name="check" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default SupplementActionCard;
