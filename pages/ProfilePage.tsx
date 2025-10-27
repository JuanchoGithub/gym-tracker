import React, { useContext } from 'react';
import { I18nContext } from '../contexts/I18nContext';
import { useI18n } from '../hooks/useI18n';

const ProfilePage: React.FC = () => {
  const { locale, setLocale } = useContext(I18nContext);
  const { t } = useI18n();

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
      </div>
    </div>
  );
};

export default ProfilePage;