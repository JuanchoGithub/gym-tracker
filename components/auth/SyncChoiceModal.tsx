import React from 'react';
import Modal from '../common/Modal';
import { Icon } from '../common/Icon';
import { useI18n } from '../../hooks/useI18n';

interface SyncChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUseCloud: () => void;
    onUseLocal: () => void;
    isLoading: boolean;
}

const SyncChoiceModal: React.FC<SyncChoiceModalProps> = ({
    isOpen,
    onClose,
    onUseCloud,
    onUseLocal,
    isLoading,
}) => {
    const { t } = useI18n();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('sync_choice_title') || 'Sync Your Data'}
        >
            <div className="space-y-4">
                <p className="text-text-secondary">
                    {t('sync_choice_description') || 'You have data on this device and in the cloud. Which would you like to use?'}
                </p>

                <div className="space-y-3">
                    <button
                        onClick={onUseCloud}
                        disabled={isLoading}
                        className="w-full flex items-center gap-3 bg-primary hover:bg-sky-600 disabled:bg-gray-500 text-white font-semibold py-4 px-4 rounded-lg transition-colors"
                    >
                        <Icon name="cloud" className="w-6 h-6" />
                        <div className="text-left">
                            <div>{t('sync_choice_use_cloud') || 'Use Cloud Data'}</div>
                            <div className="text-sm font-normal opacity-80">
                                {t('sync_choice_use_cloud_desc') || 'Download your data from the cloud'}
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={onUseLocal}
                        disabled={isLoading}
                        className="w-full flex items-center gap-3 bg-secondary hover:bg-slate-500 disabled:bg-gray-500 text-white font-semibold py-4 px-4 rounded-lg transition-colors"
                    >
                        <Icon name="smartphone" className="w-6 h-6" />
                        <div className="text-left">
                            <div>{t('sync_choice_use_local') || "Use This Device's Data"}</div>
                            <div className="text-sm font-normal opacity-80">
                                {t('sync_choice_use_local_desc') || 'Upload your local data to the cloud'}
                            </div>
                        </div>
                    </button>
                </div>

                {isLoading && (
                    <p className="text-center text-text-secondary text-sm">
                        {t('common_loading') || 'Syncing...'}
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default SyncChoiceModal;
