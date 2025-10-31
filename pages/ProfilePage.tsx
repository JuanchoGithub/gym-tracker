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

const ProfilePage: React.FC = () => {
  const { locale, setLocale } = useContext(I18nContext);
  const { t } = useI18n();
  const { 
    weightUnit, 
    setWeightUnit,
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
  } = useContext(AppContext);

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

  // Load available speech synthesis voices
  useEffect(() => {
    getAvailableVoices(locale).then(setVoices);
  }, [locale]);

  // Update status if changed outside the app, e.g., in browser settings
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
    if (checked) { // Trying to enable
      if (permissionStatus === 'granted') {
          setEnableNotifications(true);
      } else {
          const newPermission = await Notification.requestPermission();
          if (newPermission === 'granted') {
              setEnableNotifications(true);
          }
          setPermissionStatus(newPermission);
      }
    } else { // Trying to disable
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
        // If no voice is selected, use the first available one for the sample,
        // which is a good guess for the default.
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
            <label className="text-text-primary">{t('profile_weight_unit')}</label>
            <div className="flex rounded-lg bg-slate-700 p-1">
              <button 
                onClick={() => setWeightUnit('kg')}
                className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${weightUnit === 'kg' ? 'bg-primary text-white' : 'text-text-secondary'}`}
              >KG</button>
              <button
                onClick={() => setWeightUnit('lbs')}
                className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${weightUnit === 'lbs' ? 'bg-primary text-white' : 'text-text-secondary'}`}
              >LBS</button>
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

      {infoModalContent && (
        <Modal isOpen={!!infoModalContent} onClose={() => setInfoModalContent(null)} title={infoModalContent.title}>
            <p className="text-text-secondary">{infoModalContent.message}</p>
        </Modal>
      )}
    </div>
  );
};

export default ProfilePage;