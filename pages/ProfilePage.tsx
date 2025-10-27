import React, { useContext, useState } from 'react';
import { I18nContext, TranslationKey } from '../contexts/I18nContext';
import { useI18n } from '../hooks/useI18n';
import { AppContext } from '../contexts/AppContext';
import { formatSecondsToMMSS, parseTimerInput } from '../utils/timeUtils';

const ProfilePage: React.FC = () => {
  const { locale, setLocale } = useContext(I18nContext);
  const { t } = useI18n();
  const { 
    weightUnit, 
    setWeightUnit,
    defaultRestTimes,
    setDefaultRestTimes
  } = useContext(AppContext);

  const [editingTimerKey, setEditingTimerKey] = useState<keyof typeof defaultRestTimes | null>(null);
  const [tempTimerValue, setTempTimerValue] = useState('');

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

  const timerSettings: { key: keyof typeof defaultRestTimes; labelKey: TranslationKey }[] = [
    { key: 'normal', labelKey: 'timer_normal' },
    { key: 'warmup', labelKey: 'timer_warmup' },
    { key: 'drop', labelKey: 'timer_drop' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center">{t('profile_title')}</h1>

      <div className="bg-surface p-4 rounded-lg shadow">
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
              {timerSettings.map(({ key, labelKey }) => (
                <div key={key} className="flex justify-between items-center text-lg">
                    <span className="text-text-primary">{t(labelKey)}</span>
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

      </div>
    </div>
  );
};

export default ProfilePage;
