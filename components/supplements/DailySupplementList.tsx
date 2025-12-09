
import React, { useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import { SupplementPlanItem } from '../../types';
import { getExplanationIdForSupplement } from '../../services/explanationService';
import { getDateString } from '../../utils/timeUtils';
import SupplementHistoryModal from '../modals/SupplementHistoryModal';
import { TranslationKey } from '../../contexts/I18nContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { DayMode } from '../../contexts/SupplementContext';

// Explicit mapping of Translation Keys to Group Buckets
const TIME_KEY_MAP: Record<string, string> = {
    'supplements_time_pre_workout': 'pre_workout',
    'supplements_time_morning': 'morning',
    'supplements_time_morning_with_meal': 'morning',
    'supplements_time_with_breakfast': 'morning',
    'supplements_time_intra_workout': 'intra_workout',
    'supplements_time_post_workout': 'post_workout',
    'supplements_time_lunch': 'lunch',
    'supplements_time_with_meal': 'with_meal',
    'supplements_time_evening': 'evening',
    'supplements_time_before_bed': 'evening',
    'supplements_time_daily': 'daily',
    'supplements_time_daily_any': 'daily'
};

const timeKeywords = {
    en: {
        morning: /morning|breakfast|am/i,
        pre_workout: /pre-workout|pre-entreno/i,
        post_workout: /post-workout|post-entreno/i,
        lunch: /lunch|noon|midday/i,
        with_meal: /meal|food/i,
        evening: /evening|bed|night|sleep|pm/i,
    },
    es: {
        morning: /mañana|desayuno|am/i,
        pre_workout: /pre-entreno|pre-workout/i,
        post_workout: /post-entreno|post-entrenamiento/i,
        lunch: /almuerzo|mediodía/i,
        with_meal: /comida|alimento/i,
        evening: /noche|dormir|cama|sueño|pm/i,
    }
};

// Sort helper - Lower number means earlier in the day
const timeOrder: { [key: string]: number } = {
    pre_workout: 0.5, // Explicitly before morning
    morning: 1,
    intra_workout: 2.5,
    post_workout: 3,
    lunch: 3.5,
    with_meal: 4,
    evening: 5,
    daily: 6
};

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DailySupplementListProps {
  date: Date;
  readOnly?: boolean;
  title?: React.ReactNode;
  subTitle?: string;
  onOpenExplanation?: (id: string) => void;
}

const DailySupplementList: React.FC<DailySupplementListProps> = ({ date, readOnly = false, title, subTitle, onOpenExplanation }) => {
  const { supplementPlan, userSupplements, takenSupplements, toggleSupplementIntake, dayOverrides, setDayOverride } = useContext(AppContext);
  const { t, locale } = useI18n();
  const [isSmartSortEnabled, setIsSmartSortEnabled] = useState(true);
  const [hasSmartSortChanges, setHasSmartSortChanges] = useState(false);
  const [historyItem, setHistoryItem] = useState<SupplementPlanItem | null>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(modeMenuRef, () => setIsModeMenuOpen(false));

  const dateString = getDateString(date);
  const takenIds = takenSupplements[dateString] || [];
  const trainingTime = supplementPlan?.info?.trainingTime || 'afternoon';
  const override = dayOverrides[dateString];
  
  const getTimeKey = useCallback((time: string): string => {
    // 1. Direct Key Mapping (Best/New Standard)
    if (TIME_KEY_MAP[time]) return TIME_KEY_MAP[time];

    // 2. Legacy Fallback
    const keywords = timeKeywords[locale as keyof typeof timeKeywords] || timeKeywords.en;
    
    for (const key in keywords) {
        if (keywords[key as keyof typeof keywords].test(time)) {
            return key;
        }
    }
    return 'daily';
  }, [locale]);

  const handleToggleTaken = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    toggleSupplementIntake(dateString, itemId);
  };

  const handleItemClick = (item: SupplementPlanItem) => {
      setHistoryItem(item);
  };
  
  const handleModeChange = (mode: DayMode | null) => {
      setDayOverride(dateString, mode);
      setIsModeMenuOpen(false);
  }

  const { groupedPlan, orderedGroups, isTrainingDay, scheduledCount, dayTypeLabel } = useMemo(() => {
    const dayOfWeek = daysOfWeek[date.getDay()];
    // Determine base status from plan
    const isPlanTrainingDay = !!supplementPlan?.info?.trainingDays?.includes(dayOfWeek);
    
    // Determine effective status from override
    let isTrainingDay = isPlanTrainingDay;
    let dayTypeLabel = isTrainingDay ? t('supplements_workout_day') : t('supplements_rest_day');

    if (override === 'heavy') {
        isTrainingDay = true;
        dayTypeLabel = t('supplements_workout_day');
    } else if (override === 'light') {
        isTrainingDay = true;
        dayTypeLabel = t('smart_recovery_mode');
    } else if (override === 'rest') {
        isTrainingDay = false;
        dayTypeLabel = t('supplements_rest_day');
    }
    
    // Combine plan items + user items if no plan, or just plan items if plan exists
    const itemsSource = supplementPlan ? supplementPlan.plan : userSupplements;

    if (!itemsSource || itemsSource.length === 0) {
      return { groupedPlan: {}, orderedGroups: [], isTrainingDay, scheduledCount: 0, dayTypeLabel };
    }
    
    // 1. Filter items for today
    const itemsForDay = itemsSource.filter(item => {
        if (item.restDayOnly) return !isTrainingDay;
        if (item.trainingDayOnly) return isTrainingDay;
        return true;
    }).map(item => {
        // Special logic for creatine on rest days
        if (getExplanationIdForSupplement(item.supplement) === 'creatine' && !isTrainingDay) {
            // Use the key for "With Breakfast"
            return { ...item, time: 'supplements_time_with_breakfast' };
        }
        return item;
    }).filter(item => {
        // Special Logic: If 'Light' day (Active Recovery), hide stimulants (Pre-workout)
        if (override === 'light') {
             const key = getTimeKey(item.time);
             if (key === 'pre_workout') return false;
        }
        return true;
    });

    // 2. Grouping Logic with Smart Sort detection
    let changesDetected = false;

    const grouped = itemsForDay.reduce((acc, item) => {
        let key = getTimeKey(item.time);
        const originalKey = key;

        // --- SMART SORTING LOGIC ---
        if (isSmartSortEnabled && isTrainingDay) {
             // Move Post workout items into Morning/Evening buckets if applicable
             if (key === 'post_workout' || key === 'intra_workout') {
                 if (trainingTime === 'morning') {
                     key = 'morning';
                 } else if (trainingTime === 'night') {
                     key = 'evening';
                 }
             }
             // For Pre-workout, if training in evening, move to evening group, otherwise keep as separate high priority group
             if (key === 'pre_workout' && trainingTime === 'night') {
                 key = 'evening';
             }
        }

        if (key !== originalKey) {
            changesDetected = true;
        }

        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, SupplementPlanItem[]>);
    
    const ordered = Object.keys(grouped).sort((a, b) => (timeOrder[a] || 99) - (timeOrder[b] || 99));
    
    return { groupedPlan: grouped, orderedGroups: ordered, isTrainingDay, scheduledCount: itemsForDay.length, changesDetected, dayTypeLabel };
  }, [supplementPlan, userSupplements, getTimeKey, date, t, isSmartSortEnabled, trainingTime, override]);

  // Use the memoized result to set the flag for rendering the banner
  useEffect(() => {
      // Logic for showing banner: Training day and user trains at extreme times
      setHasSmartSortChanges(!!groupedPlan && isTrainingDay && (trainingTime === 'morning' || trainingTime === 'night'));
  }, [groupedPlan, isTrainingDay, trainingTime]);


  return (
    <div className="space-y-6">
      {title}
      
      {/* Day Mode Selector */}
      <div className="flex justify-center -mt-2 mb-4 relative z-20" ref={modeMenuRef}>
          <button 
             onClick={() => !readOnly && setIsModeMenuOpen(!isModeMenuOpen)}
             className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-all ${
                 override ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-white/10 text-text-secondary'
             }`}
          >
              <span className="font-bold text-sm">{dayTypeLabel}</span>
              {!readOnly && <Icon name="arrow-down" className={`w-4 h-4 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} />}
          </button>
          
          {isModeMenuOpen && (
              <div className="absolute top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col z-30">
                  <button onClick={() => handleModeChange(null)} className="px-4 py-3 text-left hover:bg-white/5 text-sm text-text-secondary border-b border-white/5">Auto</button>
                  <button onClick={() => handleModeChange('rest')} className="px-4 py-3 text-left hover:bg-white/5 text-sm text-text-secondary border-b border-white/5">{t('supplements_rest_day')}</button>
                  <button onClick={() => handleModeChange('light')} className="px-4 py-3 text-left hover:bg-white/5 text-sm text-green-400 border-b border-white/5">{t('smart_recovery_mode')}</button>
                  <button onClick={() => handleModeChange('heavy')} className="px-4 py-3 text-left hover:bg-white/5 text-sm text-primary font-bold">{t('supplements_workout_day')}</button>
              </div>
          )}
      </div>

      {/* Smart Schedule Notification */}
      {isSmartSortEnabled && hasSmartSortChanges && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-3">
                  <Icon name="sparkles" className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                      <p className="text-sm font-bold text-indigo-200">{t('supplements_smart_schedule_active')}</p>
                      <p className="text-xs text-indigo-200/70">
                          {t('supplements_smart_schedule_desc', { time: t(`supplements_training_time_${trainingTime}` as any).toLowerCase() })}
                      </p>
                  </div>
              </div>
              <button 
                  onClick={() => setIsSmartSortEnabled(false)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 whitespace-nowrap mt-1 underline"
              >
                  {t('supplements_smart_schedule_undo')}
              </button>
          </div>
      )}

      {/* Restore Banner */}
      {!isSmartSortEnabled && hasSmartSortChanges && (
           <div className="bg-surface/50 border border-white/5 p-2 rounded-lg flex justify-center">
               <button 
                  onClick={() => setIsSmartSortEnabled(true)}
                  className="text-xs font-bold text-text-secondary hover:text-primary flex items-center gap-1"
              >
                  <Icon name="sparkles" className="w-3 h-3" />
                  {t('supplements_smart_schedule_enable')}
              </button>
           </div>
      )}

      {orderedGroups.length === 0 ? (
        <div className="text-center text-text-secondary py-10">
            <Icon name="capsule" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{readOnly ? t('supplements_log_no_data_for_date') : t('supplements_no_plan')}</p>
        </div>
      ) : (
        orderedGroups.map(groupName => (
            <div key={groupName}>
                <h3 className="text-lg font-semibold text-text-secondary mb-3 border-b border-secondary/20 pb-2 capitalize">
                    {/* Handle translation for standard keys, or fallback to capitalized key for re-mapped groups */}
                    {['morning', 'lunch', 'evening', 'pre_workout', 'post_workout', 'intra_workout'].includes(groupName) 
                        ? t(`supplements_timegroup_${groupName}` as any) 
                        : t(`supplements_timegroup_${groupName}` as any) || groupName
                    }
                </h3>
                <div className="space-y-3">
                    {groupedPlan[groupName].map(item => {
                        const isTaken = takenIds.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                className={`bg-surface rounded-lg shadow-md flex items-stretch transition-opacity w-full overflow-hidden border border-white/5 ${isTaken ? 'opacity-50' : 'opacity-100'}`}
                            >
                                {/* Checkbox Area */}
                                <button
                                    onClick={(e) => handleToggleTaken(e, item.id)}
                                    disabled={readOnly}
                                    className={`px-4 flex items-center justify-center transition-colors hover:bg-black/10 active:bg-black/20 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                                    aria-label={`Mark ${item.supplement} as ${isTaken ? 'not taken' : 'taken'}`}
                                >
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${isTaken ? 'bg-primary border-primary' : 'border-secondary'}`}>
                                        {isTaken && <Icon name="check" className="w-4 h-4 text-white" />}
                                    </div>
                                </button>

                                {/* Content Area - Click for History */}
                                <button 
                                    onClick={() => handleItemClick(item)}
                                    className="flex-grow p-4 pl-0 text-left hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-bold text-base truncate text-white ${isTaken ? 'line-through text-text-secondary' : 'text-primary'}`}>{item.supplement}</h4>
                                        
                                        {item.stock !== undefined && item.stock <= 5 && !isTaken && (
                                            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                                                Low: {item.stock}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 my-2 flex-wrap">
                                        <span className={`font-mono text-base px-3 py-1 rounded-full transition-colors ${isTaken ? 'bg-slate-700 text-text-secondary line-through' : 'bg-secondary/50'}`}>{item.dosage}</span>
                                        {/* Display Translated Time */}
                                        <p className={`text-sm font-semibold transition-colors ${isTaken ? 'line-through text-text-secondary/70' : 'text-text-secondary'}`}>
                                            {t(item.time as TranslationKey)}
                                        </p>
                                    </div>
                                    {item.notes && <p className={`text-sm transition-colors whitespace-pre-wrap ${isTaken ? 'line-through text-text-secondary/70' : 'text-text-primary'}`}>{item.notes}</p>}
                                </button>
                                
                                {onOpenExplanation && getExplanationIdForSupplement(item.supplement) && (
                                     <button 
                                         onClick={(e) => { 
                                             e.stopPropagation(); 
                                             const id = getExplanationIdForSupplement(item.supplement);
                                             if (id) onOpenExplanation(id);
                                         }}
                                         className="px-3 flex items-center justify-center text-text-secondary/30 hover:text-primary hover:bg-white/5 transition-colors border-l border-white/5"
                                     >
                                         <Icon name="question-mark-circle" className="w-5 h-5" />
                                     </button>
                                 )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))
      )}

      {historyItem && (
        <SupplementHistoryModal 
            isOpen={!!historyItem}
            onClose={() => setHistoryItem(null)}
            item={historyItem}
        />
      )}
    </div>
  );
};

export default DailySupplementList;
