
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
declare var LZString: any;

const ImportWorkoutModal: React.FC<ImportWorkoutModalProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { upsertRoutine, rawExercises, setRawExercises } = useContext(AppContext);
    
    const [activeTab, setActiveTab] = useState<'scan' | 'file'>('scan');
    const [status, setStatus] = useState<'idle' | 'scanning' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isCodeDetected, setIsCodeDetected] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setIsVideoReady(false);
            setIsCodeDetected(false);
            if (activeTab === 'scan') {
                startCamera();
            }
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, activeTab]);

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
            // Ask for high quality to resolve dense QR dots
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage(t('import_workout_camera_error'));
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            videoRef.current.play().then(() => {
                setIsVideoReady(true);
                setStatus('scanning');
                requestRef.current = requestAnimationFrame(scan);
            }).catch(err => {
                console.error("Video play failed", err);
                setStatus('error');
                setErrorMessage(t('import_workout_camera_error'));
            });
        }
    };

    const scan = () => {
        if (activeTab !== 'scan' || !isOpen) return;
        
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;

            if (context && videoWidth > 0 && videoHeight > 0) {
                if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
                    canvas.width = videoWidth;
                    canvas.height = videoHeight;
                }
                
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                const code = typeof jsQR !== 'undefined' ? jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                }) : null;

                if (code && code.data) {
                    setIsCodeDetected(true);
                    try {
                        let rawData = code.data;
                        
                        // Handle URL format: find the part after #/import/
                        if (rawData.includes('#/import/')) {
                            rawData = rawData.split('#/import/')[1];
                        }

                        let decoded = null;
                        
                        // 1. Try LZ Decompression
                        if (typeof LZString !== 'undefined') {
                            try {
                                decoded = LZString.decompressFromEncodedURIComponent(rawData);
                            } catch (e) {}
                        }

                        // 2. Fallback
                        if (!decoded) {
                            try {
                                decoded = decodeURIComponent(rawData);
                            } catch (e) {
                                decoded = rawData;
                            }
                        }

                        const payload = JSON.parse(decoded!);
                        if (payload.type === 'fortachon_workout' && payload.routine) {
                            if ('vibrate' in navigator) navigator.vibrate(50);
                            handleImport(payload);
                            return; 
                        }
                    } catch (e) {
                        // Not valid yet, keep scanning
                    }
                } else {
                    setIsCodeDetected(false);
                }
            }
        }
        requestRef.current = requestAnimationFrame(scan);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.type === 'fortachon_workout' && json.routine) {
                    handleImport(json);
                } else {
                    setStatus('error');
                    setErrorMessage(t('import_workout_error'));
                }
            } catch (err) {
                setStatus('error');
                setErrorMessage(t('import_workout_error'));
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImport = (payload: any) => {
        stopCamera();
        const routine: Routine = payload.routine;
        const customExercises: Exercise[] = payload.customExercises || [];

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

        upsertRoutine(routine);
        setStatus('success');
        setSuccessMessage(t('import_workout_success', { name: routine.name }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('import_workout_title')}>
            <div className="flex flex-col space-y-6">
                {status !== 'success' && status !== 'error' && (
                     <div className="flex bg-slate-900 rounded-lg p-1">
                        <button 
                            onClick={() => setActiveTab('scan')}
                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'scan' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
                        >
                            {t('import_workout_scan_tab')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('file')}
                            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'file' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-white'}`}
                        >
                            {t('import_workout_file_tab')}
                        </button>
                    </div>
                )}

                {activeTab === 'scan' && (status === 'scanning' || status === 'idle') && (
                    <div className="relative overflow-hidden rounded-2xl bg-black aspect-square w-full shadow-inner border border-white/5 animate-fadeIn">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            onLoadedMetadata={handleLoadedMetadata}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`} 
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {!isVideoReady && status !== 'error' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        )}

                        <div className="absolute inset-0 border-[3rem] border-black/40 flex items-center justify-center pointer-events-none">
                            <div className={`w-full h-full border-2 rounded-lg relative transition-colors duration-300 ${isCodeDetected ? 'border-success' : 'border-primary/50'}`}>
                                <div className={`absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 transition-colors ${isCodeDetected ? 'border-success' : 'border-primary'}`}></div>
                                <div className={`absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 transition-colors ${isCodeDetected ? 'border-success' : 'border-primary'}`}></div>
                                <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 transition-colors ${isCodeDetected ? 'border-success' : 'border-primary'}`}></div>
                                <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 transition-colors ${isCodeDetected ? 'border-success' : 'border-primary'}`}></div>
                                
                                <div className={`absolute top-0 left-0 right-0 h-0.5 shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-[scan_2s_linear_infinite] ${isCodeDetected ? 'bg-success' : 'bg-primary/50'}`}></div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold transition-colors ${isCodeDetected ? 'bg-success text-white' : 'bg-black/60 text-white'}`}>
                                {isCodeDetected ? 'Code Detected...' : t('import_workout_instructions')}
                            </span>
                        </div>
                    </div>
                )}

                {activeTab === 'file' && (status === 'idle' || status === 'scanning') && (
                    <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-black/20 animate-fadeIn">
                        <div className="p-4 bg-indigo-500/10 rounded-full mb-4">
                            <Icon name="import" className="w-10 h-10 text-indigo-400" />
                        </div>
                        <p className="text-text-secondary text-sm text-center mb-6 px-6">
                            Choose a workout file shared with you via email or message.
                        </p>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            {t('import_workout_file_btn')}
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <Icon name="warning" className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-red-400 font-bold">{errorMessage}</p>
                        <button 
                            onClick={() => { setStatus('idle'); setIsVideoReady(false); setIsCodeDetected(false); }} 
                            className="bg-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                            {t('common_undo')}
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center py-8 space-y-4 animate-fadeIn">
                        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                            <Icon name="check" className="w-8 h-8 text-success" />
                        </div>
                        <p className="text-white font-bold text-lg leading-snug px-4">{successMessage}</p>
                        <button 
                            onClick={onClose} 
                            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                            {t('common_close')}
                        </button>
                    </div>
                )}
                
                {status !== 'success' && (
                    <button 
                        onClick={onClose}
                        className="w-full bg-surface border border-white/10 hover:bg-surface-highlight text-text-secondary font-bold py-3 rounded-xl transition-all"
                    >
                        {t('common_cancel')}
                    </button>
                )}
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
            `}</style>
        </Modal>
    );
};

export default ImportWorkoutModal;
