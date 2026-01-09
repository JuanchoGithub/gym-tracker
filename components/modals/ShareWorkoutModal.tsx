
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

const ShareWorkoutModal: React.FC<ShareWorkoutModalProps> = ({ isOpen, onClose, routine }) => {
    const { t } = useI18n();
    const { rawExercises } = useContext(AppContext);

    const sharePayload = useMemo(() => {
        // Collect custom exercises used in this routine
        const usedExerciseIds = new Set(routine.exercises.map(ex => ex.exerciseId));
        const customExercises = rawExercises.filter(ex => 
            usedExerciseIds.has(ex.id) && !ex.id.startsWith('ex-')
        );

        // Strip heavy fields to keep payload small for QR
        const routineCopy = {
            ...routine,
            lastUsed: undefined,
            id: `template-${Date.now()}` // Give it a fresh ID for the recipient
        };

        const payload = {
            type: 'fortachon_workout',
            version: 1,
            routine: routineCopy,
            customExercises
        };

        const json = JSON.stringify(payload);
        
        // QR character limit safety (approx 2.9k for standard high-density QR)
        if (json.length > 2800) {
            return null;
        }

        return encodeURIComponent(json);
    }, [routine, rawExercises]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('share_workout')}>
            <div className="flex flex-col items-center justify-center p-4 space-y-6">
                {!sharePayload ? (
                    <div className="text-center space-y-4">
                        <Icon name="warning" className="w-12 h-12 text-warning mx-auto" />
                        <p className="text-red-400 font-bold">{t('share_workout_payload_error')}</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white p-4 rounded-2xl shadow-xl">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${sharePayload}`} 
                                alt="Workout QR Code" 
                                className="w-56 h-56 sm:w-64 sm:h-64" 
                            />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-white font-bold text-lg">{routine.name}</p>
                            <p className="text-text-secondary text-sm max-w-xs">{t('share_workout_desc')}</p>
                        </div>
                    </>
                )}
                <button 
                    onClick={onClose}
                    className="w-full bg-secondary hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
                >
                    {t('common_close')}
                </button>
            </div>
        </Modal>
    );
};

export default ShareWorkoutModal;
