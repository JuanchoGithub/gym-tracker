
import React from 'react';
import { UnlockEvent } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';

interface UnlockHistoryProps {
  unlocks: UnlockEvent[];
}

const UnlockHistory: React.FC<UnlockHistoryProps> = ({ unlocks }) => {
  const { t } = useI18n();

  if (!unlocks || unlocks.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-xs font-bold text-text-secondary/70 uppercase tracking-widest ml-4 mb-3">{t('profile_unlock_history_title')}</h3>
      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden p-4 space-y-4">
        {unlocks.map((event, index) => (
          <div key={index} className="flex items-start gap-3 relative">
            {index < unlocks.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-[-16px] w-0.5 bg-white/10"></div>
            )}
            <div className="bg-amber-500/20 p-1.5 rounded-full border border-amber-500/30 z-10 flex-shrink-0">
               <Icon name="trophy" className="w-3 h-3 text-amber-400" />
            </div>
            <div className="flex-grow">
                <p className="text-sm text-white">
                    {t('profile_unlock_message', { from: event.fromExercise, to: event.toExercise })}
                </p>
                <p className="text-xs text-text-secondary/60 mt-0.5">
                    {new Date(event.date).toLocaleDateString()}
                </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnlockHistory;
