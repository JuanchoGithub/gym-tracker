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
            title={t('sync_choice_title')}
        >
            <div className="space-y-4">
                <p className="text-text-secondary">
                    {t('sync_choice_description')}
                </p>

                <div className="space-y-3">
                    <button
                        onClick={onUseCloud}
                        disabled={isLoading}
                        className="w-full flex items-center gap-3 bg-primary hover:bg-sky-600 disabled:bg-gray-500 text-white font-semibold py-4 px-4 rounded-lg transition-colors"
                    >
                        <Icon name="cloud" className="w-6 h-6" />
                        <div className="text-left">
                            <div>{t('sync_choice_use_cloud')}</div>
                            <div className="text-sm font-normal opacity-80">
                                {t('sync_choice_use_cloud_desc')}
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
                            <div>{t('sync_choice_use_local')}</div>
                            <div className="text-sm font-normal opacity-80">
                                {t('sync_choice_use_local_desc')}
                            </div>
                        </div>
                    </button>
                </div>

                {isLoading && (
                    <p className="text-center text-text-secondary text-sm">
                        {t('sync_syncing')}
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default SyncChoiceModal;
