
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useI18n } from '../../hooks/useI18n';
import { useMeasureUnit } from '../../hooks/useWeight';
import { Icon } from '../common/Icon';
import Modal from '../common/Modal';
import OneRepMaxDetailView from './OneRepMaxDetailView';
import { calculate1RM } from '../../utils/workoutUtils';
import { TranslationKey } from '../../contexts/I18nContext';
import AddExercisesModal from '../modals/AddExercisesModal';
import { calculateSyntheticAnchors, getInferredMax } from '../../services/analyticsService';

interface OneRepMaxHubProps {
    isOpen: boolean;
    onClose: () => void;
}

const OneRepMaxHub: React.FC<OneRepMaxHubProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { profile, allTimeBestSets, getExerciseById, updateOneRepMax, history, exercises } = useContext(AppContext);
    const { displayWeight, weightUnit } = useMeasureUnit();
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const coreIds = ['ex-2', 'ex-1', 'ex-3', 'ex-4']; // Squat, Bench, Deadlift, OHP
    
    // Compute synthetic anchors once for the list
    const syntheticAnchors = useMemo(() => calculateSyntheticAnchors(history, exercises, profile), [history, exercises, profile]);

    // Helper to render exercise card
    const ExerciseCard = ({ id, isCore = false }: { id: string, isCore?: boolean }) => {
        const exercise = getExerciseById(id);
        if (!exercise) return null;

        const storedEntry = profile.oneRepMaxes?.[id];
        const storedMax = storedEntry?.weight || 0;
        const bestSet = allTimeBestSets[id];
        const calculatedMax = bestSet ? calculate1RM(bestSet.weight, bestSet.reps) : 0;
        
        const inferredData = getInferredMax(exercise, syntheticAnchors, exercises);
        const inferredMax = inferredData ? inferredData.value : 0;

        const hasNewPotential = calculatedMax > storedMax;
        const isTested = storedEntry?.method === 'tested';
        
        // Effective max to show: Stored > Inferred
        const displayMax = storedMax > 0 ? storedMax : inferredMax;
        const isInferredOnly = storedMax === 0 && inferredMax > 0;

        return (
            <button 
                onClick={() => setSelectedExerciseId(id)}
                className={`w-full text-left rounded-2xl p-4 relative transition-all active:scale-[0.98] ${isCore ? 'bg-surface border border-white/10 h-full min-h-[10rem] flex flex-col justify-between hover:border-primary/50' : 'bg-surface/50 border border-white/5 flex justify-between items-center hover:bg-surface'}`}
            >
                {hasNewPotential && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
                
                <div>
                    <h4 className={`font-bold text-text-primary ${isCore ? 'text-lg min-h-[3.5rem] line-clamp-2 leading-7' : 'text-sm'}`}>{exercise.name}</h4>
                    <div className="flex gap-2 mt-1">
                        {storedMax > 0 ? (
                             <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isTested ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
                                 {t(isTested ? 'orm_tested_badge' : 'orm_estimated_badge')}
                             </span>
                        ) : (
                            isInferredOnly ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
                                    Inferred
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border text-yellow-400 border-yellow-500/30 bg-yellow-500/10">
                                    {t('orm_calibrate')}
                                </span>
                            )
                        )}
                    </div>
                </div>

                <div className={isCore ? "" : "text-right"}>
                    <span className={`font-mono font-bold ${isInferredOnly ? 'text-indigo-200/70' : 'text-white'} ${isCore ? 'text-3xl' : 'text-xl'}`}>
                        {displayMax > 0 ? displayWeight(displayMax) : '-'}
                    </span>
                    <span className="text-xs text-text-secondary ml-1">{t(('workout_' + weightUnit) as TranslationKey)}</span>
                </div>
            </button>
        );
    };

    // Filter accessory list (exclude core 4)
    const accessoryIds = Object.keys(profile.oneRepMaxes || {}).filter(id => !coreIds.includes(id));
    
    // Filter by search
    const filteredAccessories = accessoryIds.filter(id => {
        const ex = getExerciseById(id);
        return ex?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={undefined}
            contentClassName="bg-[#0f172a] w-full h-full sm:h-[85vh] sm:max-w-2xl m-0 sm:m-4 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
        >
            {selectedExerciseId && getExerciseById(selectedExerciseId) ? (
                <div className="flex flex-col h-full p-6 overflow-y-auto">
                    <OneRepMaxDetailView 
                        exercise={getExerciseById(selectedExerciseId)!} 
                        onBack={() => setSelectedExerciseId(null)} 
                    />
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-white/10 bg-surface/30">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold text-white">{t('orm_title')}</h2>
                            <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                                <Icon name="x" className="w-6 h-6 text-text-secondary" />
                            </button>
                        </div>
                        <p className="text-text-secondary text-sm">{t('orm_hub_subtitle')}</p>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6 space-y-8">
                        <section>
                            <h3 className="text-xs font-bold text-text-secondary/70 uppercase tracking-widest mb-4">{t('orm_core_lifts')}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {coreIds.map(id => <ExerciseCard key={id} id={id} isCore />)}
                            </div>
                        </section>

                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-text-secondary/70 uppercase tracking-widest">{t('orm_accessories')}</h3>
                                <button onClick={() => setIsAddModalOpen(true)} className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                                    <Icon name="plus" className="w-3 h-3" />
                                    {t('common_add')}
                                </button>
                            </div>
                            
                            <div className="relative mb-4">
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('orm_search_placeholder')}
                                    className="w-full bg-surface border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-text-secondary/50 focus:border-primary outline-none"
                                />
                                <Icon name="search" className="w-4 h-4 text-text-secondary absolute left-3.5 top-3.5" />
                            </div>

                            <div className="space-y-3">
                                {filteredAccessories.length > 0 ? filteredAccessories.map(id => <ExerciseCard key={id} id={id} />) : (
                                    <p className="text-center text-text-secondary text-sm py-4 opacity-50">{searchTerm ? t('exercises_no_match') : "No accessories tracked yet."}</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            )}
            <AddExercisesModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={(ids) => {
                    ids.forEach(id => {
                         // Just initialize if not exists, value 0, so it appears in the list
                         if (!profile.oneRepMaxes?.[id]) {
                             updateOneRepMax(id, 0, 'calculated');
                         }
                    });
                    setIsAddModalOpen(false);
                }}
            />
        </Modal>
    );
};

export default OneRepMaxHub;
