
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { I18nContext, TranslationKey } from '../contexts/I18nContext';
import { useI18n } from '../hooks/useI18n';
import { AppContext } from '../contexts/AppContext';
import { formatSecondsToMMSS, parseTimerInput } from '../utils/timeUtils';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { requestNotificationPermission } from '../services/notificationService';
import { getAvailableVoices, speak } from '../services/speechService';
import { Icon } from '../components/common/Icon';
import Modal from '../components/common/Modal';
import WeightChartModal from '../components/profile/WeightChartModal';
import { useMeasureUnit } from '../hooks/useWeight';
import { convertCmToFtIn, convertFtInToCm } from '../utils/weightUtils';
import { calculateLifterDNA } from '../services/analyticsService';
import LifterDNA from '../components/profile/LifterDNA';
import UnlockHistory from '../components/profile/UnlockHistory';
import StrengthProfile from '../components/profile/StrengthProfile';
import MuscleHeatmap from '../components/insights/MuscleHeatmap';
import { calculateMuscleFreshness } from '../utils/fatigueUtils';
import OneRepMaxDetailView from '../components/onerepmax/OneRepMaxDetailView';
import FatigueMonitor from '../components/profile/FatigueMonitor';
import { UserGoal } from '../types';
import AccountSection from '../components/profile/AccountSection';

const SettingsGroup: React.FC<{ title?: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        {title && <h3 className="text-xs font-bold text-text-secondary/70 uppercase tracking-widest ml-4 mb-3">{title}</h3>}
        <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">
            {children}
        </div>
    </div>
);

const SettingsItem: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className, onClick }) => (
    <div
        className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${className || ''} ${onClick ? 'cursor-pointer group' : ''}`}
        onClick={onClick}
    >
        {children}
    </div>
);

const USFlag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className="w-7 h-5 rounded-sm shadow-sm object-cover block">
        <rect width="60" height="40" fill="#b22234" />
        <rect y="3.08" width="60" height="3.08" fill="#fff" />
        <rect y="9.24" width="60" height="3.08" fill="#fff" />
        <rect y="15.4" width="60" height="3.08" fill="#fff" />
        <rect y="21.56" width="60" height="3.08" fill="#fff" />
        <rect y="27.72" width="60" height="3.08" fill="#fff" />
        <rect y="33.88" width="60" height="3.08" fill="#fff" />
        <rect width="26" height="22" fill="#3c3b6e" />
        <g fill="#fff">
            <path transform="translate(3,3) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(8,3) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(13,3) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(18,3) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(23,3) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(5.5,7) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(10.5,7) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(15.5,7) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(20.5,7) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />

            <path transform="translate(3,11) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(8,11) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(13,11) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(18,11) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
            <path transform="translate(23,11) scale(0.8)" d="M2.5,0L3.2,2.5L6,2.5L3.8,4L4.5,6.5L2.5,5L0.5,6.5L1.2,4L-1,2.5L1.8,2.5Z" />
        </g>
    </svg>
);

const ArgentinaFlag = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className="w-7 h-5 rounded-sm shadow-sm object-cover block">
        <rect width="60" height="40" fill="#74acdf" />
        <rect y="13.33" width="60" height="13.34" fill="#fff" />
        <g transform="translate(30, 20) scale(0.4)">
            <circle r="8" fill="#f6b40e" />
            <g stroke="#f6b40e" strokeWidth="2">
                <line x1="0" y1="-12" x2="0" y2="12" />
                <line x1="-12" y1="0" x2="12" y2="0" />
                <line x1="-8" y1="-8" x2="8" y2="8" />
                <line x1="8" y1="-8" x2="-8" y2="8" />
            </g>
        </g>
    </svg>
);

const ProfilePage: React.FC = () => {
    const { locale, setLocale } = useContext(I18nContext);
    const { t } = useI18n();
    const {
        defaultRestTimes,
        setDefaultRestTimes,
        useLocalizedExerciseNames,
        setUseLocalizedExerciseNames,
        keepScreenAwake,
        setKeepScreenAwake,
        enableNotifications,
        setEnableNotifications,
        selectedVoiceURI,
        setSelectedVoiceURI,
        fontSize,
        setFontSize,
        profile,
        updateProfileInfo,
        currentWeight,
        logWeight,
        history,
        exercises,
        getExerciseById,
        measureUnit,
        importData,
        exportData
    } = useContext(AppContext);

    const { displayWeight, getStoredWeight, weightUnit, setMeasureUnit } = useMeasureUnit();
    const [localWeight, setLocalWeight] = useState(() => currentWeight ? displayWeight(currentWeight) : '');
    const [isWeightChartOpen, setIsWeightChartOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'you' | 'options'>('you');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [feet, setFeet] = useState('');
    const [inches, setInches] = useState('');
    const [selectedOrmExerciseId, setSelectedOrmExerciseId] = useState<string | null>(null);

    const [pendingImportData, setPendingImportData] = useState<any>(null);
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [importStatusMsg, setImportStatusMsg] = useState<{ title: string, msg: string } | null>(null);

    const [wakeLockPermission, setWakeLockPermission] = useState<'granted' | 'denied' | 'unsupported'>('granted');

    const lifterStats = useMemo(() => calculateLifterDNA(history, currentWeight || 70), [history, currentWeight]);

    const muscleFreshness = useMemo(() => {
        return calculateMuscleFreshness(history, exercises, profile.mainGoal, profile);
    }, [history, exercises, profile.mainGoal, profile]);

    useEffect(() => {
        if (!('wakeLock' in navigator)) {
            setWakeLockPermission('unsupported');
            return;
        }
        const checkPermission = async () => {
            try {
                if ('permissions' in navigator) {
                    // @ts-ignore
                    const result = await navigator.permissions.query({ name: 'screen-wake-lock' });
                    if (result.state === 'denied') {
                        setWakeLockPermission('denied');
                        if (keepScreenAwake) setKeepScreenAwake(false);
                    } else {
                        setWakeLockPermission('granted');
                    }
                    result.onchange = () => {
                        if (result.state === 'denied') {
                            setWakeLockPermission('denied');
                            if (keepScreenAwake) setKeepScreenAwake(false);
                        } else {
                            setWakeLockPermission('granted');
                        }
                    };
                }
            } catch (e) { }
        };
        checkPermission();
    }, [keepScreenAwake, setKeepScreenAwake]);

    useEffect(() => {
        setLocalWeight(currentWeight ? displayWeight(currentWeight) : '');
    }, [currentWeight, displayWeight]);

    useEffect(() => {
        if (measureUnit === 'imperial' && profile.height) {
            const { feet: ft, inches: inc } = convertCmToFtIn(profile.height);
            setFeet(ft > 0 ? String(ft) : '');
            setInches(inc > 0 ? String(inc) : '');
        }
    }, [profile.height, measureUnit]);

    const handleWeightBlur = () => {
        const newWeight = parseFloat(localWeight);
        if (!isNaN(newWeight) && newWeight > 0) {
            logWeight(getStoredWeight(newWeight));
        } else {
            setLocalWeight(currentWeight ? displayWeight(currentWeight) : '');
        }
    };

    const handleHeightChangeImperial = (ft: string, inc: string) => {
        const feetNum = parseInt(ft) || 0;
        const inchesNum = parseInt(inc) || 0;
        const totalCm = convertFtInToCm(feetNum, inchesNum);
        updateProfileInfo({ height: totalCm > 0 ? totalCm : undefined });
    };

    const handleLanguageChange = (newLocale: 'en' | 'es') => {
        setLocale(newLocale);
        setMeasureUnit(newLocale === 'es' ? 'metric' : 'imperial');
    };

    const handleGoalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateProfileInfo({
            mainGoal: e.target.value as UserGoal,
            smartGoalDetection: true,
            goalMismatchSnoozedUntil: 0
        });
    };

    const handleSmartGoalToggle = (checked: boolean) => {
        updateProfileInfo({ smartGoalDetection: checked });
    };

    const handleBioAdaptiveToggle = (checked: boolean) => {
        updateProfileInfo({ bioAdaptiveEngine: checked });
    };

    const [editingTimerKey, setEditingTimerKey] = useState<keyof typeof defaultRestTimes | null>(null);
    const [tempTimerValue, setTempTimerValue] = useState('');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [infoModalContent, setInfoModalContent] = useState<{ title: string, message: string } | null>(null);

    const [permissionStatus, setPermissionStatus] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'denied';
    });

    useEffect(() => {
        getAvailableVoices(locale).then(setVoices);
    }, [locale]);

    useEffect(() => {
        if (!('Notification' in window)) return;
        const updateStatus = () => {
            if (Notification.permission !== permissionStatus) {
                const newPermission = Notification.permission;
                setPermissionStatus(newPermission);
                if (newPermission !== 'granted') {
                    setEnableNotifications(false);
                }
            }
        };
        const interval = setInterval(updateStatus, 1000);
        return () => clearInterval(interval);
    }, [permissionStatus, setEnableNotifications]);

    const handleNotificationToggle = async (checked: boolean) => {
        if (checked) {
            if (permissionStatus === 'granted') {
                setEnableNotifications(true);
            } else if (permissionStatus !== 'denied') {
                const permissionGranted = await requestNotificationPermission();
                setEnableNotifications(permissionGranted);
                setPermissionStatus(Notification.permission);
            }
        } else {
            setEnableNotifications(false);
        }
    };

    const handleTimerEdit = (key: keyof typeof defaultRestTimes) => {
        setEditingTimerKey(key);
        setTempTimerValue('');
    };

    const handleTimerBlur = () => {
        if (editingTimerKey) {
            const newTime = parseTimerInput(tempTimerValue);
            setDefaultRestTimes({ ...defaultRestTimes, [editingTimerKey]: newTime });
        }
        setEditingTimerKey(null);
    };

    const handleTimerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleTimerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 5) {
            setTempTimerValue(val);
        }
    };

    const handlePlayVoiceSample = () => {
        let voiceName: string;
        if (selectedVoiceURI) {
            const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
            voiceName = selectedVoice?.name || 'your selected voice';
        } else {
            voiceName = voices[0]?.name || 'the default voice';
        }
        const sampleText = t('profile_voice_sample', { voiceName });
        speak(sampleText, selectedVoiceURI, locale);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    const data = JSON.parse(result);
                    if (data && (Array.isArray(data.history) || Array.isArray(data.routines))) {
                        setPendingImportData(data);
                        setIsImportConfirmOpen(true);
                    } else {
                        setImportStatusMsg({ title: t('profile_import_error'), msg: t('profile_import_error_invalid') });
                    }
                }
            } catch (err) {
                setImportStatusMsg({ title: t('profile_import_error'), msg: t('profile_import_error_parse') });
            }
        };
        reader.readAsText(file);
    };

    const confirmImport = () => {
        if (pendingImportData) {
            importData(pendingImportData);
            setIsImportConfirmOpen(false);
            setPendingImportData(null);
            setImportStatusMsg({ title: t('common_success'), msg: t('profile_import_success') });
        }
    };

    const timerInputs: { key: keyof typeof defaultRestTimes; labelKey: TranslationKey, infoKey?: { title: TranslationKey, message: TranslationKey } }[] = [
        { key: 'normal', labelKey: 'timer_normal', infoKey: { title: 'timer_normal_desc_title', message: 'timer_normal_desc' } },
        { key: 'warmup', labelKey: 'timer_warmup', infoKey: { title: 'timer_warmup_desc_title', message: 'timer_warmup_desc' } },
        { key: 'drop', labelKey: 'timer_drop', infoKey: { title: 'timer_drop_desc_title', message: 'timer_drop_desc' } },
        { key: 'effort', labelKey: 'timer_effort', infoKey: { title: 'timer_effort_desc_title', message: 'timer_effort_desc' } },
        { key: 'failure', labelKey: 'timer_failure', infoKey: { title: 'timer_failure_desc_title', message: 'timer_failure_desc' } },
    ];

    const inputClass = "bg-background border border-white/10 rounded-lg p-2 text-right w-32 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono";
    const selectClass = "bg-background border border-white/10 rounded-lg p-2 text-right min-w-[120px] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

    const bigLifts = ['ex-2', 'ex-1', 'ex-3', 'ex-4', 'ex-5'];

    return (
        <div className="space-y-6 pb-8">
            <h1 className="text-3xl font-bold text-center mb-6">{t('profile_title')}</h1>

            <AccountSection />

            <div className="flex justify-center border-b border-secondary/20 mb-6">
                <button
                    onClick={() => setActiveTab('you')}
                    className={`px-6 py-2 font-medium transition-colors ${activeTab === 'you' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                >
                    {t('profile_tab_you')}
                </button>
                <button
                    onClick={() => setActiveTab('options')}
                    className={`px-6 py-2 font-medium transition-colors ${activeTab === 'options' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                >
                    {t('profile_tab_options')}
                </button>
            </div>

            {activeTab === 'you' && (
                <div className="animate-fadeIn space-y-8">
                    <FatigueMonitor history={history} exercises={exercises} muscleFreshness={muscleFreshness} />
                    <div>
                        <h3 className="text-xl font-bold text-text-primary mb-4 px-4">{t('insights_recovery_heatmap_title')}</h3>
                        <div className="max-w-md mx-auto w-full px-2">
                            <MuscleHeatmap freshnessData={muscleFreshness} />
                        </div>
                    </div>
                    <LifterDNA stats={lifterStats} />
                    <StrengthProfile />
                    <SettingsGroup title={t('orm_current_max')}>
                        {bigLifts.map(id => {
                            const exercise = getExerciseById(id);
                            const ormEntry = profile.oneRepMaxes?.[id];
                            const weight = ormEntry ? ormEntry.weight : 0;
                            if (!exercise) return null;
                            return (
                                <SettingsItem key={id} onClick={() => setSelectedOrmExerciseId(id)}>
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-text-primary font-medium">{exercise.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-primary font-mono text-sm font-bold bg-primary/10 px-3 py-1.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                {weight > 0 ? displayWeight(weight) : '-'} <span className="text-xs opacity-70">{weight > 0 ? t(('workout_' + weightUnit) as TranslationKey) : ''}</span>
                                            </span>
                                            <Icon name="arrow-right" className="w-4 h-4 text-text-secondary/50 group-hover:text-text-primary transition-colors" />
                                        </div>
                                    </div>
                                </SettingsItem>
                            );
                        })}
                    </SettingsGroup>
                    <UnlockHistory unlocks={profile.unlocks || []} />
                    <div className="bg-surface border border-white/10 rounded-2xl p-5 shadow-lg mb-6">
                        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                            <div className="p-2 rounded-full bg-slate-700 text-text-secondary">
                                <Icon name="save" className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('profile_data_title')}</h3>
                                <p className="text-xs text-text-secondary">{t('profile_data_desc')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={exportData} className="flex items-center justify-center gap-2 bg-surface-highlight hover:bg-white/10 text-text-primary font-bold py-3 px-4 rounded-xl transition-colors border border-white/5">
                                <Icon name="export" className="w-5 h-5" />
                                <span>{t('common_export')}</span>
                            </button>
                            <button onClick={handleImportClick} className="flex items-center justify-center gap-2 bg-surface-highlight hover:bg-white/10 text-text-primary font-bold py-3 px-4 rounded-xl transition-colors border border-white/5">
                                <Icon name="import" className="w-5 h-5" />
                                <span>{t('common_import')}</span>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'options' && (
                <div className="animate-fadeIn">
                    <SettingsGroup title={t('profile_personal_info')}>
                        <SettingsItem>
                            <label htmlFor="gender-select" className="text-text-primary font-medium">{t('profile_gender')}</label>
                            <select id="gender-select" value={profile.gender || ''} onChange={(e) => updateProfileInfo({ gender: e.target.value as 'male' | 'female' })} className={selectClass}>
                                <option value="" disabled>{t('common_select')}</option>
                                <option value="male">{t('profile_gender_male')}</option>
                                <option value="female">{t('profile_gender_female')}</option>
                            </select>
                        </SettingsItem>
                        <SettingsItem>
                            <label htmlFor="height-input" className="text-text-primary font-medium">{t('profile_height')}</label>
                            {measureUnit === 'metric' ? (
                                <div className="flex items-center relative w-32">
                                    <input id="height-input-cm" type="number" value={profile.height || ''} onChange={(e) => updateProfileInfo({ height: parseInt(e.target.value) || undefined })} onFocus={(e) => e.target.select()} className={`${inputClass} pr-10 w-full`} placeholder="175" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">{t('profile_height_unit_cm')}</span>
                                </div>
                            ) : (
                                <div className="flex gap-2 items-center">
                                    <div className="relative">
                                        <input id="height-input-ft" type="number" value={feet} onChange={(e) => { setFeet(e.target.value); handleHeightChangeImperial(e.target.value, inches); }} onFocus={(e) => e.target.select()} placeholder="5" className="bg-background border border-white/10 rounded-lg p-2 w-16 text-center focus:border-primary outline-none" />
                                        <span className="absolute right-2 top-2 text-text-secondary text-xs pointer-events-none">{t('profile_height_unit_ft')}</span>
                                    </div>
                                    <div className="relative">
                                        <input id="height-input-in" type="number" value={inches} onChange={(e) => { setInches(e.target.value); handleHeightChangeImperial(feet, e.target.value); }} onFocus={(e) => e.target.select()} placeholder="9" className="bg-background border border-white/10 rounded-lg p-2 w-16 text-center focus:border-primary outline-none" />
                                        <span className="absolute right-2 top-2 text-text-secondary text-xs pointer-events-none">{t('profile_height_unit_in')}</span>
                                    </div>
                                </div>
                            )}
                        </SettingsItem>
                        <SettingsItem>
                            <label htmlFor="weight-input" className="text-text-primary font-medium">{t('profile_weight')}</label>
                            <div className="flex items-center gap-2">
                                <div className="relative w-32">
                                    <input id="weight-input" type="number" value={localWeight} onChange={(e) => setLocalWeight(e.target.value)} onFocus={(e) => e.target.select()} onBlur={handleWeightBlur} className={`${inputClass} pr-10 w-full`} placeholder="70.5" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">{t(`workout_${weightUnit}` as TranslationKey)}</span>
                                </div>
                                <button onClick={() => setIsWeightChartOpen(true)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" disabled={!profile.weightHistory || profile.weightHistory.length === 0}>
                                    <Icon name="chart-line" className="w-5 h-5" />
                                </button>
                            </div>
                        </SettingsItem>
                    </SettingsGroup>

                    <SettingsGroup title={t('profile_goal_section')}>
                        <SettingsItem>
                            <label htmlFor="goal-select" className="text-text-primary font-medium">{t('profile_main_goal')}</label>
                            <select id="goal-select" value={profile.mainGoal || 'muscle'} onChange={handleGoalChange} className={selectClass}>
                                <option value="strength">{t('profile_goal_strength')}</option>
                                <option value="muscle">{t('profile_goal_muscle')}</option>
                                <option value="endurance">{t('profile_goal_endurance')}</option>
                            </select>
                        </SettingsItem>
                        <SettingsItem>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">{t('profile_smart_goal_detect')}</span>
                                <span className="text-xs text-text-secondary">{t('profile_smart_goal_detect_desc')}</span>
                            </div>
                            <ToggleSwitch checked={profile.smartGoalDetection !== false} onChange={handleSmartGoalToggle} />
                        </SettingsItem>
                        <SettingsItem>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">Bio-Adaptive Engine</span>
                                <span className="text-xs text-text-secondary">Auto-regulate recovery based on intensity & density</span>
                            </div>
                            <ToggleSwitch checked={profile.bioAdaptiveEngine !== false} onChange={handleBioAdaptiveToggle} />
                        </SettingsItem>
                    </SettingsGroup>

                    <SettingsGroup title={t('profile_settings')}>
                        <SettingsItem>
                            <label className="text-text-primary font-medium">{t('profile_language')}</label>
                            <div className="flex gap-3">
                                <button onClick={() => handleLanguageChange('en')} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${locale === 'en' ? 'bg-primary/10 border-primary' : 'bg-transparent border-white/10 opacity-60'}`}>
                                    <USFlag />
                                    <span className={`text-sm font-bold ${locale === 'en' ? 'text-primary' : 'text-text-secondary'}`}>English</span>
                                </button>
                                <button onClick={() => handleLanguageChange('es')} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${locale === 'es' ? 'bg-primary/10 border-primary' : 'bg-transparent border-white/10 opacity-60'}`}>
                                    <ArgentinaFlag />
                                    <span className={`text-sm font-bold ${locale === 'es' ? 'text-primary' : 'text-text-secondary'}`}>Español</span>
                                </button>
                            </div>
                        </SettingsItem>
                        {locale !== 'en' && (
                            <SettingsItem>
                                <div className="flex flex-col">
                                    <span className="text-text-primary font-medium">{t('profile_localized_names')}</span>
                                    <span className="text-xs text-text-secondary">{t('profile_localized_names_desc')}</span>
                                </div>
                                <ToggleSwitch checked={useLocalizedExerciseNames} onChange={setUseLocalizedExerciseNames} />
                            </SettingsItem>
                        )}
                        <SettingsItem>
                            <label className="text-text-primary font-medium">{t('profile_measure_unit')}</label>
                            <div className="flex bg-background rounded-lg p-1 border border-white/10">
                                <button onClick={() => setMeasureUnit('metric')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${measureUnit === 'metric' ? 'bg-primary text-white' : 'text-text-secondary'}`}>{t('profile_unit_metric')}</button>
                                <button onClick={() => setMeasureUnit('imperial')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${measureUnit === 'imperial' ? 'bg-primary text-white' : 'text-text-secondary'}`}>{t('profile_unit_imperial')}</button>
                            </div>
                        </SettingsItem>
                    </SettingsGroup>

                    <SettingsGroup title={t('profile_default_timers')}>
                        <div className="p-0">
                            {timerInputs.map(({ key, labelKey, infoKey }) => (
                                <SettingsItem key={key}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-text-primary font-medium">{t(labelKey)}</span>
                                        {infoKey && (
                                            <button onClick={() => setInfoModalContent({ title: t(infoKey.title), message: t(infoKey.message) })}>
                                                <Icon name="question-mark-circle" className="w-4 h-4 text-text-secondary" />
                                            </button>
                                        )}
                                    </div>
                                    {editingTimerKey === key ? (
                                        <input type="text" inputMode="numeric" value={tempTimerValue} onChange={handleTimerInputChange} onBlur={handleTimerBlur} onKeyDown={handleTimerKeyDown} onFocus={(e) => e.target.select()} autoFocus className="bg-background border border-primary rounded-lg p-1.5 w-24 text-center text-sm outline-none" placeholder="m:ss" />
                                    ) : (
                                        <button onClick={() => handleTimerEdit(key)} className="text-primary font-mono text-sm font-bold hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
                                            {defaultRestTimes[key] > 0 ? formatSecondsToMMSS(defaultRestTimes[key]) : t('timer_modal_none')}
                                        </button>
                                    )}
                                </SettingsItem>
                            ))}
                        </div>
                    </SettingsGroup>

                    <SettingsGroup title={t('profile_app_behaviour')}>
                        <SettingsItem>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">{t('profile_keep_screen_awake')}</span>
                                <span className="text-xs text-text-secondary">{t('profile_keep_screen_awake_desc')}</span>
                                {wakeLockPermission === 'denied' && <span className="text-xs text-warning mt-1">{t('profile_wake_lock_blocked')}</span>}
                                {wakeLockPermission === 'unsupported' && <span className="text-xs text-warning mt-1">{t('profile_wake_lock_unsupported')}</span>}
                            </div>
                            <ToggleSwitch checked={keepScreenAwake && wakeLockPermission === 'granted'} onChange={setKeepScreenAwake} />
                        </SettingsItem>
                        <SettingsItem>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">{t('profile_enable_notifications')}</span>
                                <span className="text-xs text-text-secondary">{t('profile_enable_notifications_desc')}</span>
                                {permissionStatus === 'denied' && <span className="text-xs text-warning mt-1">{t('profile_notifications_blocked')}</span>}
                            </div>
                            <ToggleSwitch checked={enableNotifications && permissionStatus === 'granted'} onChange={handleNotificationToggle} />
                        </SettingsItem>
                        <SettingsItem>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">{t('profile_font_size')}</span>
                                <span className="text-xs text-text-secondary">{t('profile_font_size_desc')}</span>
                            </div>
                            <div className="flex bg-background rounded-lg p-1 border border-white/10">
                                {(['normal', 'large', 'xl'] as const).map((size) => (
                                    <button key={size} onClick={() => setFontSize(size)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${fontSize === size ? 'bg-primary text-white shadow-md' : 'text-text-secondary'}`}>{t(`profile_font_${size}` as any)}</button>
                                ))}
                            </div>
                        </SettingsItem>
                    </SettingsGroup>

                    <SettingsGroup title={t('profile_voice_settings')}>
                        <SettingsItem>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">{t('profile_voice')}</span>
                                <span className="text-xs text-text-secondary">{t('profile_voice_desc')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <select id="voice-select" value={selectedVoiceURI || ''} onChange={(e) => setSelectedVoiceURI(e.target.value || null)} className="bg-background border border-white/10 rounded-lg p-2 max-w-[140px] text-sm truncate outline-none" disabled={voices.length === 0}>
                                    <option value="">Default</option>
                                    {voices.map((voice) => (<option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>))}
                                </select>
                                <button onClick={handlePlayVoiceSample} className="p-2 bg-background border border-white/10 hover:bg-white/5 rounded-lg transition-colors" disabled={voices.length === 0}>
                                    <Icon name="play" className="w-4 h-4" />
                                </button>
                            </div>
                        </SettingsItem>
                    </SettingsGroup>

                    <SettingsGroup title={t('profile_about')}>
                        <SettingsItem onClick={() => setIsShareModalOpen(true)}>
                            <div className="flex flex-col">
                                <span className="text-text-primary font-medium">{t('profile_share_app')}</span>
                                <span className="text-xs text-text-secondary">{t('profile_share_desc')}</span>
                            </div>
                            <Icon name="share" className="w-5 h-5 text-text-secondary" />
                        </SettingsItem>
                    </SettingsGroup>
                </div>
            )}

            {isWeightChartOpen && <WeightChartModal isOpen={isWeightChartOpen} onClose={() => setIsWeightChartOpen(false)} history={profile.weightHistory} />}
            {infoModalContent && <Modal isOpen={!!infoModalContent} onClose={() => setInfoModalContent(null)} title={infoModalContent.title}><p className="text-text-secondary">{infoModalContent.message}</p></Modal>}
            <Modal isOpen={!!selectedOrmExerciseId} onClose={() => setSelectedOrmExerciseId(null)} contentClassName="bg-[#0f172a] w-full h-full sm:h-[85vh] sm:max-w-2xl m-0 sm:m-4 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10">
                {selectedOrmExerciseId && getExerciseById(selectedOrmExerciseId) && (
                    <div className="flex flex-col h-full p-6 overflow-y-auto">
                        <OneRepMaxDetailView exercise={getExerciseById(selectedOrmExerciseId)!} onBack={() => setSelectedOrmExerciseId(null)} />
                    </div>
                )}
            </Modal>
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={t('profile_share_app')}>
                <div className="flex flex-col items-center justify-center p-4 space-y-6">
                    <div className="bg-white p-3 rounded-2xl shadow-lg">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://fortachon.vercel.app" alt="QR Code" className="w-48 h-48 sm:w-56 sm:h-56" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-bold text-lg mb-1">{t('profile_scan_qr')}</p>
                        <p className="text-primary font-mono text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/20">https://fortachon.vercel.app</p>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isImportConfirmOpen} onClose={() => { setIsImportConfirmOpen(false); setPendingImportData(null); }} title={t('common_import')}>
                <div className="space-y-4">
                    <div className="flex items-start gap-3 text-warning bg-warning/10 p-3 rounded-lg border border-warning/20">
                        <Icon name="warning" className="w-6 h-6 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-warning mb-1">{t('profile_import_confirm')}</p>
                            <p className="text-xs text-text-secondary/80">{t('profile_import_confirm_details')}</p>
                        </div>
                    </div>
                    {pendingImportData && (
                        <div className="bg-surface-highlight/30 rounded-xl p-4 text-sm space-y-2 border border-white/5">
                            <p className="text-white font-semibold border-b border-white/10 pb-2 mb-2">{t('profile_import_summary_title')}</p>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                <div className="flex justify-between"><span className="text-text-secondary">{t('profile_import_summary_workouts')}:</span><span className="text-white font-mono font-bold">{pendingImportData.history?.length || 0}</span></div>
                                <div className="flex justify-between"><span className="text-text-secondary">{t('profile_import_summary_templates')}:</span><span className="text-white font-mono font-bold">{pendingImportData.routines?.length || 0}</span></div>
                                <div className="flex justify-between"><span className="text-text-secondary">{t('profile_import_summary_exercises')}:</span><span className="text-white font-mono font-bold">{pendingImportData.exercises?.length || 0}</span></div>
                                <div className="flex justify-between"><span className="text-text-secondary">{t('profile_import_summary_supplements')}:</span><span className="text-white font-mono font-bold">{(pendingImportData.supplementPlan?.plan?.length || 0) + (pendingImportData.userSupplements?.length || 0)}</span></div>
                                <div className="flex justify-between"><span className="text-text-secondary">{t('profile_import_summary_settings')}:</span><span className="text-white font-mono font-bold">{pendingImportData.settings ? t('common_yes') : t('common_no')}</span></div>
                                <div className="flex justify-between"><span className="text-text-secondary">{t('profile_import_summary_profile')}:</span><span className="text-white font-mono font-bold">{pendingImportData.profile ? t('common_yes') : t('common_no')}</span></div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => { setIsImportConfirmOpen(false); setPendingImportData(null); }} className="bg-secondary hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors">{t('common_cancel')}</button>
                        <button onClick={confirmImport} className="bg-primary hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg transition-colors">{t('common_confirm')}</button>
                    </div>
                </div>
            </Modal>
            {importStatusMsg && (<Modal isOpen={!!importStatusMsg} onClose={() => setImportStatusMsg(null)} title={importStatusMsg.title}><p className="text-text-secondary mb-4">{importStatusMsg.msg}</p><button onClick={() => setImportStatusMsg(null)} className="w-full bg-primary text-white font-bold py-2 rounded-lg">{t('common_close')}</button></Modal>)}
        </div>
    );
};

export default ProfilePage;
