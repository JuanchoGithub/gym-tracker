import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';
import DailySupplementList from './DailySupplementList';

const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const getDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const SupplementLog: React.FC = () => {
    const { supplementPlan, takenSupplements } = useContext(AppContext);
    const { t } = useI18n();
    const [displayDate, setDisplayDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const today = useMemo(() => new Date(), []);

    const changeMonth = (amount: number) => {
        setDisplayDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with different month lengths
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const calendarData = useMemo(() => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        
        // Add padding for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ key: `prev-${i}`, isPadding: true });
        }

        // Add days of the current month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = getDateString(date);
            const dayOfWeek = daysOfWeek[date.getDay()];
            const isTrainingDay = !!supplementPlan?.info?.trainingDays?.includes(dayOfWeek);

            const scheduledItems = supplementPlan?.plan.filter(item => !item.trainingDayOnly || isTrainingDay) || [];
            const takenItems = takenSupplements[dateString] || [];
            
            const adherence = scheduledItems.length > 0 
                ? (takenItems.filter(id => scheduledItems.some(si => si.id === id)).length / scheduledItems.length) 
                : -1; // -1 indicates no items scheduled

            const isToday = date.toDateString() === today.toDateString();

            days.push({ key: dateString, date, isToday, adherence, isPadding: false });
        }

        return days;
    }, [displayDate, supplementPlan, takenSupplements, today]);

    const handleDayClick = (dayData: any) => {
        if (dayData.isPadding || !dayData.date || dayData.date > today) return;
        setSelectedDate(dayData.date);
    };

    return (
        <div className="bg-surface p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-secondary">
                    <Icon name="arrow-down" className="-rotate-90" />
                </button>
                <h2 className="text-xl font-bold text-center">
                    {t(`month_${monthKeys[displayDate.getMonth()]}` as any)} {displayDate.getFullYear()}
                </h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-secondary">
                    <Icon name="arrow-down" className="rotate-90" />
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary mb-2">
                {daysOfWeek.map(day => <div key={day}>{t(`supplements_day_${day.slice(0, 3)}_short` as any)}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {calendarData.map(day => {
                    if (day.isPadding) return <div key={day.key} className="h-16"></div>;
                    
                    const canClick = day.date && day.date <= today;

                    let adherenceColor = 'bg-transparent';
                    if (day.adherence !== -1 && day.date && day.date < today) {
                        if (day.adherence >= 1) adherenceColor = 'bg-success';
                        else if (day.adherence > 0) adherenceColor = 'bg-yellow-500';
                        else adherenceColor = 'bg-secondary';
                    }
                    
                    return (
                        <div 
                            key={day.key} 
                            onClick={() => handleDayClick(day)}
                            className={`h-16 flex flex-col items-center justify-center rounded-lg ${canClick ? 'cursor-pointer hover:bg-slate-700' : 'opacity-50'}`}
                        >
                            <span className={`w-8 h-8 flex items-center justify-center rounded-full ${day.isToday ? 'ring-2 ring-primary' : ''}`}>
                                {day.date?.getDate()}
                            </span>
                            {day.adherence !== -1 && day.date && day.date < today && (
                                <div className={`w-2 h-2 rounded-full mt-1 ${adherenceColor}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {selectedDate && (
                <Modal 
                    isOpen={!!selectedDate} 
                    onClose={() => setSelectedDate(null)}
                    title={selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    contentClassName="bg-surface rounded-lg shadow-xl w-[calc(100%-1rem)] max-w-lg h-[calc(100%-2rem)] max-h-[600px] m-auto flex flex-col p-4 sm:p-6"
                >
                    <div className="flex-grow overflow-y-auto min-h-0 pr-2" style={{ overscrollBehaviorY: 'contain' }}>
                        <DailySupplementList date={selectedDate} />
                    </div>
                    <div className="flex-shrink-0 pt-4 mt-4 border-t border-secondary/20">
                        <button onClick={() => setSelectedDate(null)} className="w-full bg-secondary text-white font-bold py-3 rounded-lg hover:bg-slate-600 transition-colors">
                            {t('common_close')}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SupplementLog;