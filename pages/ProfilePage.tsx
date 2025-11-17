

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

  // State for imperial height inputs
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');

  useEffect(() => {
    setLocalWeight(currentWeight ? displayWeight(currentWeight) : '');
  }, [currentWeight, displayWeight]);
  
  // Sync imperial height inputs with profile data
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-3xl font-bold text-center">{t('profile_title')}</h1>

      <div className="bg-surface p-3 sm:p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">{t('profile_personal_info')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="gender-select" className="block text-sm font-medium text-text-secondary mb-1">{t('profile_gender')}</label>
              <select
                id="gender-select"
                value={profile.gender || ''}
                onChange={(e) => updateProfileInfo({ gender: e.target.value as 'male' | 'female' })}
                className="w-full bg-slate-700 border border-secondary/50 rounded-md p-2"
              >
                <option value="" disabled>{t('common_select')}</option>
                <option value="male">{t('profile_gender_male')}</option>
                <option value="female">{t('profile_gender_female')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="height-input-cm" className="block text-sm font-medium text-text-secondary mb-1">{t('profile_height')}</label>
              {measureUnit === 'metric' ? (
                <div className="relative">
                  <input
                    id="height-input-cm"
                    type="number"
                    value={profile.height || ''}
                    onChange={(e) => updateProfileInfo({ height: parseInt(e.target.value) || undefined })}
                    className="w-full bg-slate-700 border border-secondary/50 rounded-md p-2 pr-12"
                    placeholder="175"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t('profile_height_unit_cm')}</span>
                </div>
              ) : (
                <div className="flex gap-2">
                    <div className="relative">
                        <input id="height-input-ft" type="number" value={feet} onChange={(e) => { setFeet(e.target.value); handleHeightChangeImperial(e.target.value, inches); }} placeholder="5" className="w-full bg-slate-700 border border-secondary/50 rounded-md p-2 pr-10" />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t('profile_height_unit_ft')}</span>
                    </div>
                    <div className="relative">
                        <input id="height-input-in" type="number" value={inches} onChange={(e) => { setInches(e.target.value); handleHeightChangeImperial(feet, e.target.value); }} placeholder="9" className="w-full bg-slate-700 border border-secondary/50 rounded-md p-2 pr-10" />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">{t('profile_height_unit_in')}</span>
                    </div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="weight-input" className="block text-sm font-medium text-text-secondary mb-1">{t('profile_weight')}</label>
              <div className="relative flex items-center gap-2">
                <input
                  id="weight-input"
                  type="number"
                  value={localWeight}
                  onChange={(e) => setLocalWeight(e.target.value)}
                  onBlur={handleWeightBlur}
                  className="w-full bg-slate-700 border border-secondary/50 rounded-md p-2 pr-12"
                  placeholder="70.5"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary pointer-events-none">{t(`workout_${weightUnit}`)}</span>
                <button 
                  onClick={() => setIsWeightChartOpen(true)} 
                  className="p-2 text-text-secondary hover:text-primary bg-slate-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('profile_view_weight_history')}
                  disabled={!profile.weightHistory || profile.weightHistory.length === 0}
                >
                    <Icon name="chart-line" />
                </button>
              </div>
            </div>
        </div>
      </div>

      <div className="bg-surface p-3 sm:p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">{t('profile_settings')}</h2>
        
        <div className="flex items-center justify-between">
          <label htmlFor="language-select" className="text-text-primary">{t('profile_language')}</label>
          <select
            id="language-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
            className="bg-slate-700 border border-secondary/50 rounded-md p-2"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {locale !== 'en' && (
          <div className="mt-6 pt-4 border-t border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                  <label className="text-text-primary">{t('profile_localized_names')}</label>
                  <p className="text-xs text-text-secondary">{t('profile_localized_names_desc')}</p>
              </div>
              <div className="flex rounded-lg bg-slate-700 p-1">
                <button 
                  onClick={() => setUseLocalizedExerciseNames(true)}
                  className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${useLocalizedExerciseNames ? 'bg-primary text-white' : 'text-text-secondary'}`}
                >{t('common_yes')}</button>
                <button
                  onClick={() => setUseLocalizedExerciseNames(false)}
                  className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${!useLocalizedExerciseNames ? 'bg-primary text-white' : 'text-text-secondary'}`}
                >{t('common_no')}</button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-secondary/20">
          <div className="flex items-center justify-between">
            <label className="text-text-primary">{t('profile_measure_unit')}</label>
            <div className="flex rounded-lg bg-slate-700 p-1">
              <button 
                onClick={() => setMeasureUnit('metric')}
                className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${measureUnit === 'metric' ? 'bg-primary text-white' : 'text-text-secondary'}`}
              >{t('profile_unit_metric')}</button>
              <button
                onClick={() => setMeasureUnit('imperial')}
                className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${measureUnit === 'imperial' ? 'bg-primary text-white' : 'text-text-secondary'}`}
              >{t('profile_unit_imperial')}</button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-secondary/20">
            <h3 className="text-text-primary mb-2">{t('profile_default_timers')}</h3>
            <p className="text-sm text-text-secondary mb-4">{t('profile_default_timers_desc')}</p>
            <div className="space-y-3">
              {timerSettings.map(({ key, labelKey, infoKey }) => (
                <div key={key} className="flex justify-between items-center text-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-text-primary">{t(labelKey)}</span>
                        {infoKey && (
                            <button onClick={() => setInfoModalContent({title: t(infoKey.title), message: t(infoKey.message)})}>
                                <Icon name="question-mark-circle" className="w-5 h-5 text-text-secondary" />
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
                            className="bg-slate-900 border border-primary rounded-lg p-2 w-28 text-center"
                            placeholder="m:ss or secs"
                        />
                    ) : (
                        <button 
                            onClick={() => handleTimerEdit(key)}
                            className="bg-slate-200 text-slate-800 font-mono rounded-lg px-4 py-2 w-28 text-center hover:bg-slate-300 transition-colors"
                        >
                            {defaultRestTimes[key] > 0 ? formatSecondsToMMSS(defaultRestTimes[key]) : t('timer_modal_none')}
                        </button>
                    )}
                </div>
              ))}
            </div>
        </div>

        <div className="mt-6 pt-4 border-t border-secondary/20">
            <h3 className="text-text-primary mb-2">{t('profile_app_behaviour')}</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-text-primary">{t('profile_keep_screen_awake')}</label>
                        <p className="text-xs text-text-secondary">{t('profile_keep_screen_awake_desc')}</p>
                    </div>
                    <ToggleSwitch checked={keepScreenAwake} onChange={setKeepScreenAwake} />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-text-primary">{t('profile_enable_notifications')}</label>
                        <p className="text-xs text-text-secondary">{t('profile_enable_notifications_desc')}</p>
                        {permissionStatus === 'denied' && (
                          <p className="text-xs text-warning mt-1">{t('profile_notifications_blocked')}</p>
                        )}
                    </div>
                    <ToggleSwitch checked={enableNotifications && permissionStatus === 'granted'} onChange={handleNotificationToggle} />
                </div>
            </div>
        </div>

        <div className="mt-6 pt-4 border-t border-secondary/20">
            <h3 className="text-text-primary mb-2">{t('profile_voice_settings')}</h3>
            <div className="flex items-center justify-between">
                <div>
                    <label htmlFor="voice-select" className="text-text-primary">{t('profile_voice')}</label>
                    <p className="text-xs text-text-secondary">{t('profile_voice_desc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                      id="voice-select"
                      value={selectedVoiceURI || ''}
                      onChange={(e) => setSelectedVoiceURI(e.target.value || null)}
                      className="bg-slate-700 border border-secondary/50 rounded-md p-2 max-w-[150px] sm:max-w-xs truncate"
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
                      className="p-2 bg-secondary hover:bg-slate-500 rounded-md disabled:opacity-50"
                      disabled={voices.length === 0}
                      aria-label="Play voice sample"
                  >
                      <Icon name="play" className="w-5 h-5" />
                  </button>
                </div>
            </div>
        </div>

      </div>

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
