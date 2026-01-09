
import React, { useState, useEffect, useRef, useContext } from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
import { AppContext } from '../../contexts/AppContext';
import { Icon } from '../common/Icon';
import { Routine, Exercise } from '../../types';

interface ImportWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

declare var jsQR: any; // Global from script tag

const ImportWorkoutModal: React.FC<ImportWorkoutModalProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { upsertRoutine, rawExercises, setRawExercises } = useContext(AppContext);
    
    const [status, setStatus] = useState<'idle' | 'scanning' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen && status === 'idle') {
            startCamera();
        } else if (!isOpen) {
            stopCamera();
            setStatus('idle');
        }
        return () => stopCamera();
    }, [isOpen]);

    const stopCamera = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");
                videoRef.current.play();
                setStatus('scanning');
                requestRef.current = requestAnimationFrame(scan);
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage(t('import_workout_camera_error'));
        }
    };

    const scan = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            if (context) {
                canvas.height = videoRef.current.videoHeight;
                canvas.width = videoRef.current.videoWidth;
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                // Use the global jsQR library
                const code = typeof jsQR !== 'undefined' ? jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                }) : null;

                if (code) {
                    try {
                        const payload = JSON.parse(decodeURIComponent(code.data));
                        if (payload.type === 'fortachon_workout' && payload.routine) {
                            handleImport(payload);
                            return; // Stop scanning on success
                        }
                    } catch (e) {
                        // Not a valid JSON or not our format, keep scanning
                    }
                }
            }
        }
        requestRef.current = requestAnimationFrame(scan);
    };

    const handleImport = (payload: any) => {
        stopCamera();
        const routine: Routine = payload.routine;
        const customExercises: Exercise[] = payload.customExercises || [];

        // 1. Merge custom exercises if they don't exist
        if (customExercises.length > 0) {
            setRawExercises(prev => {
                const newExs = [...prev];
                customExercises.forEach(ce => {
                    if (!newExs.some(e => e.id === ce.id)) {
                        newExs.push(ce);
                    }
                });
                return newExs;
            });
        }

        // 2. Save the routine
        upsertRoutine(routine);
        
        setStatus('success');
        setSuccessMessage(t('import_workout_success', { name: routine.name }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('import_workout_title')}>
            <div className="flex flex-col space-y-4">
                {status === 'scanning' && (
                    <div className="relative overflow-hidden rounded-2xl bg-black aspect-square">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        {/* Overlay frame */}
                        <div className="absolute inset-0 border-[3rem] border-black/40 flex items-center justify-center">
                            <div className="w-full h-full border-2 border-primary/50 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">{t('import_workout_instructions')}</span>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center py-8 space-y-4">
                        <Icon name="warning" className="w-16 h-16 text-red-500 mx-auto" />
                        <p className="text-red-400 font-bold">{errorMessage}</p>
                        <button onClick={startCamera} className="bg-primary text-white font-bold py-2 px-6 rounded-lg">{t('common_undo')}</button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center py-8 space-y-4 animate-fadeIn">
                        <Icon name="check" className="w-16 h-16 text-success mx-auto" />
                        <p className="text-white font-bold text-lg">{successMessage}</p>
                        <button onClick={onClose} className="w-full bg-primary text-white font-bold py-3 rounded-xl">{t('common_close')}</button>
                    </div>
                )}
                
                {status !== 'success' && (
                    <button 
                        onClick={onClose}
                        className="w-full bg-secondary hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        {t('common_cancel')}
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default ImportWorkoutModal;
