import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { DataContext } from '../../contexts/DataContext';
import { UserContext } from '../../contexts/UserContext';
import { pushData, pullData, getLastSyncTime, setLastSyncTime } from '../../services/syncService';
import { useI18n } from '../../hooks/useI18n';
import { Icon } from '../common/Icon';
import AuthModal from '../auth/AuthModal';
import SyncChoiceModal from '../auth/SyncChoiceModal';

const AccountSection: React.FC = () => {
    const { t } = useI18n();
    const { user, isAuthenticated, logout, token, isLoading: authLoading } = useContext(AuthContext);
    const { history, routines, rawExercises, importDataData, syncWithCloud } = useContext(DataContext);
    const { profile, measureUnit, defaultRestTimes, useLocalizedExerciseNames, keepScreenAwake, enableNotifications, selectedVoiceURI, fontSize, importUserData } = useContext(UserContext);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSyncChoice, setShowSyncChoice] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const lastSyncTime = getLastSyncTime();

    const hasLocalData = history.length > 0 || routines.length > 0;

    // Called after successful login
    const handleLoginSuccess = () => {
        // If user has local data, show sync choice modal
        if (hasLocalData) {
            setShowSyncChoice(true);
        }
    };

    const getAllData = () => ({
        history,
        routines,
        exercises: rawExercises,
        profile,
        settings: {
            measureUnit,
            defaultRestTimes,
            useLocalizedExerciseNames,
            keepScreenAwake,
            enableNotifications,
            selectedVoiceURI,
            fontSize,
        }
    });

    const handleSync = async () => {
        if (!token) return;
        setIsSyncing(true);
        setSyncMessage(null);

        const result = await syncWithCloud(token);

        if (result.success) {
            setSyncMessage(t('sync_success'));
        } else {
            setSyncMessage(result.error || t('profile_import_error'));
        }

        setIsSyncing(false);
        setShowSyncChoice(false);
        setTimeout(() => setSyncMessage(null), 3000);
    };

    const handlePushData = async () => {
        if (!token) return;
        setIsSyncing(true);
        setSyncMessage(null);

        // One-time full push (using blobs or individual row push)
        // For convenience on login, we still do a push but marked as v2
        const result = await pushData(token, getAllData());

        if (result.success && result.syncedAt) {
            setLastSyncTime(result.syncedAt);
            setSyncMessage(t('sync_success'));
        } else {
            setSyncMessage(result.error || t('profile_import_error'));
        }

        setIsSyncing(false);
        setShowSyncChoice(false);
        setTimeout(() => setSyncMessage(null), 3000);
    };

    const handlePullData = async () => {
        if (!token) return;
        setIsSyncing(true);
        setSyncMessage(null);

        const result = await pullData(token);

        if (result.success && result.data) {
            // Import the pulled data
            if (result.data.history || result.data.routines || result.data.exercises) {
                importDataData({
                    history: result.data.history,
                    routines: result.data.routines,
                    exercises: result.data.exercises,
                });
            }
            if (result.data.profile || result.data.settings) {
                importUserData({
                    profile: result.data.profile,
                    settings: result.data.settings,
                });
            }
            if (result.lastUpdated) {
                setLastSyncTime(result.lastUpdated);
            }
            setSyncMessage(t('sync_download_success'));
        } else {
            setSyncMessage(result.error || t('profile_import_error'));
        }

        setIsSyncing(false);
        setShowSyncChoice(false);
        setTimeout(() => setSyncMessage(null), 3000);
    };

    const handleLogout = () => {
        logout();
        setSyncMessage(null);
    };

    const formatSyncTime = (time: number) => {
        const date = new Date(time);
        return date.toLocaleString(); // Better default localization
    };

    if (authLoading) {
        return (
            <div className="bg-surface rounded-xl p-4 mb-6">
                <div className="text-text-secondary text-center">{t('common_loading') || 'Loading...'}</div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-surface rounded-xl p-4 mb-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Icon name="user" className="w-5 h-5" />
                    {t('profile_account') || 'Account'}
                </h3>

                {isAuthenticated ? (
                    <div className="space-y-3">
                        {/* User info */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-text-primary font-medium">{user?.email}</p>
                                {lastSyncTime && (
                                    <p className="text-text-secondary text-sm">
                                        {t('sync_last_sync') || 'Last sync:'} {formatSyncTime(lastSyncTime)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Sync message */}
                        {syncMessage && (
                            <p className={`text-sm ${syncMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                                {syncMessage}
                            </p>
                        )}

                        {/* Action buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-sky-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm shadow-lg shadow-primary/20 active:scale-[0.98]"
                            >
                                <Icon name="upload" className="w-5 h-5" />
                                <span>{isSyncing ? t('sync_syncing') : t('sync_now')}</span>
                            </button>

                            <button
                                onClick={handlePullData}
                                disabled={isSyncing}
                                className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-slate-600 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-xl transition-all text-sm border border-white/5 active:scale-[0.98]"
                            >
                                <Icon name="download" className="w-5 h-5" />
                                <span>{t('sync_download')}</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                disabled={isSyncing}
                                className="sm:col-span-2 w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 px-4 rounded-xl transition-all text-sm border border-red-500/20 active:scale-[0.98]"
                            >
                                <Icon name="log-out" className="w-5 h-5" />
                                <span>{t('profile_account_logout')}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-text-secondary text-sm">
                            {t('profile_account_description')}
                        </p>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full bg-primary hover:bg-sky-600 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Icon name="log-in" className="w-5 h-5" />
                            {t('profile_account_signin_or_create')}
                        </button>
                    </div>
                )}
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onLoginSuccess={handleLoginSuccess}
            />

            <SyncChoiceModal
                isOpen={showSyncChoice}
                onClose={() => setShowSyncChoice(false)}
                onUseCloud={handlePullData}
                onUseLocal={handlePushData}
                isLoading={isSyncing}
            />
        </>
    );
};

export default AccountSection;
