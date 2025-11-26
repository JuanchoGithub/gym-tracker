
import React, { useContext, useState, useEffect } from 'react';
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

const SettingsGroup: React.FC<{ title?: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    {title && <h3 className="text-xs font-bold text-text-secondary/70 uppercase tracking-widest ml-4 mb-3">{title}</h3>}
    <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-sm">
      {children}
    </div>
  </div>
);

const SettingsItem: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${className || ''}`}>
    {children}
  </div>
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
    profile,
    updateProfileInfo,
    currentWeight,
    logWeight,
  } = useContext(AppContext);

  const { displayWeight, getStoredWeight, weightUnit, measureUnit, setMeasureUnit } = useMeasureUnit();
  const [localWeight, setLocalWeight] = useState(() => currentWeight ? displayWeight(currentWeight) : '');
  const [isWeightChartOpen, setIsWeightChartOpen] = useState(false);

  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  const [wakeLockPermission, setWakeLockPermission] = useState<'granted' | 'denied' | 'unsupported'>('granted');

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
        } catch (e) {
            // Fallback if query fails or not supported
        }
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

  const [editingTimerKey, setEditingTimerKey] = useState<keyof typeof defaultRestTimes | null>(null);
  const [tempTimerValue, setTempTimerValue] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [infoModalContent, setInfoModalContent] = useState<{title: string, message: string} | null>(null);
  
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

  const timerSettings: { key: keyof typeof defaultRestTimes; labelKey: TranslationKey, infoKey?: {title: TranslationKey, message: TranslationKey} }[] = [
    { key: 'normal', labelKey: 'timer_normal', infoKey: {title: 'timer_normal_desc_title', message: 'timer_normal_desc'} },
    { key: 'warmup', labelKey: 'timer_warmup', infoKey: {title: 'timer_warmup_desc_title', message: 'timer_warmup_desc'} },
    { key: 'drop', labelKey: 'timer_drop', infoKey: {title: 'timer_drop_desc_title', message: 'timer_drop_desc'} },
    { key: 'effort', labelKey: 'timer_effort', infoKey: {title: 'timer_effort_desc_title', message: 'timer_effort_desc'} },
    { key: 'failure', labelKey: 'timer_failure', infoKey: {title: 'timer_failure_desc_title', message: 'timer_failure_desc'} },
  ];

  const inputClass = "bg-background border border-white/10 rounded-lg p-2 text-right w-32 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono";
  const selectClass = "bg-background border border-white/10 rounded-lg p-2 text-right min-w-[120px] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-3xl font-bold text-center mb-6">{t('profile_title')}</h1>

      <SettingsGroup title={t('profile_personal_info')}>
        <SettingsItem>
            <label htmlFor="gender-select" className="text-text-primary font-medium">{t('profile_gender')}</label>
            <select
            id="gender-select"
            value={profile.gender || ''}
            onChange={(e) => updateProfileInfo({ gender: e.target.value as 'male' | 'female' })}
            className={selectClass}
            >
            <option value="" disabled>{t('common_select')}</option>
            <option value="male">{t('profile_gender_male')}</option>
            <option value="female">{t('profile_gender_female')}</option>
            </select>
        </SettingsItem>

        <SettingsItem>
             <label htmlFor="height-input" className="text-text-primary font-medium">{t('profile_height')}</label>
             {measureUnit === 'metric' ? (
                <div className="flex items-center relative w-32">
                  <input
                    id="height-input-cm"
                    type="number"
                    value={profile.height || ''}
                    onChange={(e) => updateProfileInfo({ height: parseInt(e.target.value) || undefined })}
                    className={`${inputClass} pr-10 w-full`}
                    placeholder="175"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">{t('profile_height_unit_cm')}</span>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <input id="height-input-ft" type="number" value={feet} onChange={(e) => { setFeet(e.target.value); handleHeightChangeImperial(e.target.value, inches); }} placeholder="5" className="bg-background border border-white/10 rounded-lg p-2 w-16 text-center focus:border-primary outline-none" />
                        <span className="absolute right-2 top-2 text-text-secondary text-xs pointer-events-none">{t('profile_height_unit_ft')}</span>
                    </div>
                    <div className="relative">
                        <input id="height-input-in" type="number" value={inches} onChange={(e) => { setInches(e.target.value); handleHeightChangeImperial(feet, e.target.value); }} placeholder="9" className="bg-background border border-white/10 rounded-lg p-2 w-16 text-center focus:border-primary outline-none" />
                        <span className="absolute right-2 top-2 text-text-secondary text-xs pointer-events-none">{t('profile_height_unit_in')}</span>
                    </div>
                </div>
              )}
        </SettingsItem>

        <SettingsItem>
            <label htmlFor="weight-input" className="text-text-primary font-medium">{t('profile_weight')}</label>
            <div className="flex items-center gap-2">
                <div className="relative w-32">
                    <input
                        id="weight-input"
                        type="number"
                        value={localWeight}
                        onChange={(e) => setLocalWeight(e.target.value)}
                        onBlur={handleWeightBlur}
                        className={`${inputClass} pr-10 w-full`}
                        placeholder="70.5"
                    />
                     <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none">{t(`workout_${weightUnit}` as TranslationKey)}</span>
                </div>
                <button 
                  onClick={() => setIsWeightChartOpen(true)} 
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  disabled={!profile.weightHistory || profile.weightHistory.length === 0}
                >
                    <Icon name="chart-line" className="w-5 h-5" />
                </button>
            </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('profile_settings')}>
        <SettingsItem>
            <label htmlFor="language-select" className="text-text-primary font-medium">{t('profile_language')}</label>
             <select
                id="language-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
                className={selectClass}
            >
                <option value="en">English</option>
                <option value="es">Español</option>
            </select>
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
              <button 
                onClick={() => setMeasureUnit('metric')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${measureUnit === 'metric' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >{t('profile_unit_metric')}</button>
              <button
                onClick={() => setMeasureUnit('imperial')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${measureUnit === 'imperial' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >{t('profile_unit_imperial')}</button>
            </div>
        </SettingsItem>
      </SettingsGroup>
      
      <SettingsGroup title={t('profile_default_timers')}>
          <div className="p-0">
              {timerSettings.map(({ key, labelKey, infoKey }) => (
                <SettingsItem key={key}>
                    <div className="flex items-center gap-2">
                        <span className="text-text-primary font-medium">{t(labelKey)}</span>
                        {infoKey && (
                            <button onClick={() => setInfoModalContent({title: t(infoKey.title), message: t(infoKey.message)})}>
                                <Icon name="question-mark-circle" className="w-4 h-4 text-text-secondary hover:text-primary" />
                            </button>
                        )}
                    </div>
                    {editingTimerKey === key ? (
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={tempTimerValue}
                            onChange={handleTimerInputChange}
                            onBlur={handleTimerBlur}
                            onKeyDown={handleTimerKeyDown}
                            autoFocus
                            className="bg-background border border-primary rounded-lg p-1.5 w-24 text-center text-sm outline-none"
                            placeholder="m:ss"
                        />
                    ) : (
                        <button 
                            onClick={() => handleTimerEdit(key)}
                            className="text-primary font-mono text-sm font-bold hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
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
                  {wakeLockPermission === 'denied' && (
                      <span className="text-xs text-warning mt-1">{t('profile_wake_lock_blocked')}</span>
                  )}
                  {wakeLockPermission === 'unsupported' && (
                      <span className="text-xs text-warning mt-1">{t('profile_wake_lock_unsupported')}</span>
                  )}
              </div>
              <ToggleSwitch checked={keepScreenAwake && wakeLockPermission === 'granted'} onChange={setKeepScreenAwake} />
          </SettingsItem>
          <SettingsItem>
              <div className="flex flex-col">
                  <span className="text-text-primary font-medium">{t('profile_enable_notifications')}</span>
                  <span className="text-xs text-text-secondary">{t('profile_enable_notifications_desc')}</span>
                   {permissionStatus === 'denied' && (
                      <span className="text-xs text-warning mt-1">{t('profile_notifications_blocked')}</span>
                   )}
              </div>
              <ToggleSwitch checked={enableNotifications && permissionStatus === 'granted'} onChange={handleNotificationToggle} />
          </SettingsItem>
      </SettingsGroup>

       <SettingsGroup title={t('profile_voice_settings')}>
          <SettingsItem>
              <div className="flex flex-col">
                  <span className="text-text-primary font-medium">{t('profile_voice')}</span>
                  <span className="text-xs text-text-secondary">{t('profile_voice_desc')}</span>
              </div>
               <div className="flex items-center gap-2">
                  <select
                      id="voice-select"
                      value={selectedVoiceURI || ''}
                      onChange={(e) => setSelectedVoiceURI(e.target.value || null)}
                      className="bg-background border border-white/10 rounded-lg p-2 max-w-[140px] text-sm truncate outline-none focus:border-primary"
                      disabled={voices.length === 0}
                  >
                      <option value="">Default</option>
                      {voices.map((voice) => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name}
                          </option>
                      ))}
                  </select>
                  <button
                      onClick={handlePlayVoiceSample}
                      className="p-2 bg-background border border-white/10 hover:bg-white/5 rounded-lg transition-colors"
                      disabled={voices.length === 0}
                      aria-label="Play voice sample"
                  >
                      <Icon name="play" className="w-4 h-4" />
                  </button>
                </div>
          </SettingsItem>
       </SettingsGroup>

      {isWeightChartOpen && (
        <WeightChartModal
          isOpen={isWeightChartOpen}
          onClose={() => setIsWeightChartOpen(false)}
          history={profile.weightHistory}
        />
      )}

      {infoModalContent && (
        <Modal isOpen={!!infoModalContent} onClose={() => setInfoModalContent(null)} title={infoModalContent.title}>
            <p className="text-text-secondary">{infoModalContent.message}</p>
        </Modal>
      )}
    </div>
  );
};

export default ProfilePage;
