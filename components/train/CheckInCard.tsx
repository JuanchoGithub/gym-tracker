
import React from 'react';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';
import { CheckInReason } from '../../contexts/AppContext';

interface CheckInCardProps {
    onCheckIn: (reason: CheckInReason) => void;
}

const CheckInCard: React.FC<CheckInCardProps> = ({ onCheckIn }) => {
    const { t } = useI18n();

    return (
        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-5 shadow-lg mb-6 animate-fadeIn">
            <div className="flex items-start gap-4 mb-4">
                <div className="bg-indigo-500/20 p-3 rounded-xl flex-shrink-0">
                    <Icon name="chart-line" className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-indigo-200">{t('checkin_title')}</h3>
                    <p className="text-sm text-indigo-100/80 mt-1 leading-relaxed">
                        {t('checkin_message')}
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                    onClick={() => onCheckIn('busy')}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
                >
                    {t('checkin_option_busy')}
                </button>
                <button 
                    onClick={() => onCheckIn('deload')}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
                >
                    {t('checkin_option_deload')}
                </button>
                <button 
                    onClick={() => onCheckIn('injury')}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
                >
                    {t('checkin_option_injury')}
                </button>
            </div>
        </div>
    );
};

export default CheckInCard;
