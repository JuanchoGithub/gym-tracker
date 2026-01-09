
import React, { useMemo, useContext } from 'react';
import Modal from '../common/Modal';
import { Routine } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { Icon } from '../common/Icon';

interface ShareWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    routine: Routine;
}

declare var LZString: any;

const ShareWorkoutModal: React.FC<ShareWorkoutModalProps> = ({ isOpen, onClose, routine }) => {
    const { t } = useI18n();
    const { rawExercises } = useContext(AppContext);

    const fullPayloadObject = useMemo(() => {
        // Collect custom exercises used in this routine
        const usedExerciseIds = new Set(routine.exercises.map(ex => ex.exerciseId));
        const customExercises = rawExercises.filter(ex => 
            usedExerciseIds.has(ex.id) && !ex.id.startsWith('ex-')
        );

        // Strip heavy transient fields
        const routineCopy = {
            ...routine,
            lastUsed: undefined,
            id: `template-${Date.now()}` 
        };

        return {
            type: 'fortachon_workout',
            version: 1,
            routine: routineCopy,
            customExercises
        };
    }, [routine, rawExercises]);

    const shareUrl = useMemo(() => {
        const json = JSON.stringify(fullPayloadObject);
        const compressed = typeof LZString !== 'undefined' 
            ? LZString.compressToEncodedURIComponent(json)
            : encodeURIComponent(json);
        
        // Construct the universal link
        const base = window.location.origin + window.location.pathname;
        return `${base}#/import/${compressed}`;
    }, [fullPayloadObject]);

    const qrImageUrl = useMemo(() => {
        // Use a high-quality encoding (size 300+) for high density
        // Encoding the full URL allows system cameras to pick it up as a link
        return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(shareUrl)}`;
    }, [shareUrl]);

    const handleShareToFile = async () => {
        const json = JSON.stringify(fullPayloadObject, null, 2);
        const fileName = `${routine.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        
        if (navigator.share) {
            try {
                const file = new File([json], fileName, { type: 'application/json' });
                await navigator.share({
                    files: [file],
                    title: `Fortachon Workout: ${routine.name}`,
                    text: `Import this workout into the Fortachon app!`
                });
            } catch (err) {
                console.error("Share failed", err);
            }
        } else {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('share_workout')}>
            <div className="flex flex-col items-center justify-center p-4 space-y-6">
                {shareUrl.length > 2500 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-2">
                        <p className="text-[10px] text-amber-200 font-medium leading-tight">
                            <Icon name="warning" className="w-3 h-3 inline mr-1" />
                            Routine is large. If the QR doesn't scan, use "Send to App" below.
                        </p>
                    </div>
                )}
                
                <div className="bg-white p-3 rounded-2xl shadow-xl">
                    <img 
                        src={qrImageUrl} 
                        alt="Workout QR Code" 
                        className="w-56 h-56 sm:w-64 sm:h-64" 
                    />
                </div>
                
                <div className="text-center space-y-2">
                    <p className="text-white font-bold text-lg">{routine.name}</p>
                    <p className="text-text-secondary text-sm max-w-xs">{t('share_workout_desc')}</p>
                    <p className="text-[10px] text-text-secondary/40 font-mono mt-1">Universal Link v2</p>
                </div>

                <div className="w-full space-y-3">
                    <button 
                        onClick={handleShareToFile}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Icon name="share" className="w-5 h-5" />
                        <span>{t('share_workout_file_btn')}</span>
                    </button>
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-surface border border-white/10 hover:bg-surface-highlight text-text-secondary font-bold py-3 rounded-xl transition-colors"
                    >
                        {t('common_close')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ShareWorkoutModal;
