import React from 'react';
import { RecommendationLog } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';

interface RecommendationHistoryProps {
    logs: RecommendationLog[];
}

const RecommendationHistory: React.FC<RecommendationHistoryProps> = ({ logs }) => {
    const { t } = useI18n();

    // Filter only relevant coaching/deload logs if needed, or show all 'coach' types
    const relevantLogs = logs.filter(log => log.type === 'coach' || log.type === 'stall').sort((a, b) => b.timestamp - a.timestamp);

    if (!relevantLogs || relevantLogs.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <h3 className="text-xs font-bold text-text-secondary/70 uppercase tracking-widest ml-4 mb-3">{t('profile_recommendation_history_title')}</h3>
            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden p-4 space-y-4">
                {relevantLogs.map((log, index) => (
                    <div key={log.id} className="flex items-start gap-3 relative">
                        {index < relevantLogs.length - 1 && (
                            <div className="absolute left-[11px] top-8 bottom-[-16px] w-0.5 bg-white/10"></div>
                        )}
                        <div className={`p-1.5 rounded-full border z-10 flex-shrink-0 ${log.actionTaken === 'apply' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}>
                            <Icon name={log.actionTaken === 'apply' ? 'check' : 'history'} className="w-3 h-3" />
                        </div>
                        <div className="flex-grow">
                            <p className="text-sm text-white font-medium">
                                {t(log.title) || log.title}
                            </p>
                            {log.reason && (
                                <p className="text-xs text-text-secondary mt-0.5">
                                    {t(log.reason) || log.reason}
                                </p>
                            )}
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-[10px] text-text-secondary/60 uppercase tracking-wide">
                                    {new Date(log.timestamp).toLocaleDateString()}
                                </p>
                                {log.actionTaken && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.actionTaken === 'apply' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-secondary'}`}>
                                        {log.actionTaken.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendationHistory;
