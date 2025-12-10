
import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { Exercise } from '../../types';
import { useExerciseName } from '../../hooks/useExerciseName';

interface PromotionBannerProps {
    targetExercise: Exercise;
    onUpgrade: () => void;
    onDismiss: () => void;
}

const PromotionBanner: React.FC<PromotionBannerProps> = ({ targetExercise, onUpgrade, onDismiss }) => {
    const { t } = useI18n();
    const getExerciseName = useExerciseName();

    return (
        <div className="mx-3 sm:mx-4 mt-3 rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0 flex-grow">
                <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-400 flex-shrink-0">
                     <Icon name="trophy" className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                        {t('promotion_modal_title')}
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                         {getExerciseName(targetExercise)}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
                 <button 
                    onClick={onUpgrade}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border border-amber-500/30"
                >
                     {t('promotion_modal_upgrade')}
                 </button>
                 <button onClick={onDismiss} className="p-1.5 text-white/50 hover:text-white transition-colors">
                     <Icon name="x" className="w-4 h-4" />
                 </button>
            </div>
        </div>
    );
};

export default PromotionBanner;
