
import React from 'react';
import Modal from '../common/Modal';
import { useI18n } from '../../hooks/useI18n';
// FIX: Removed `TranslationKey` from this import as it's not exported from `../../types`.
import { SetType } from '../../types';

interface SetTypeExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  setType: 'warmup' | 'drop' | 'failure';
}

const SetTypeExplanationModal: React.FC<SetTypeExplanationModalProps> = ({ isOpen, onClose, setType }) => {
  const { t } = useI18n();
  
  // FIX: Added `as const` to infer string literal types, making them compatible with the `TranslationKey` type expected by `t`.
  const content = {
      warmup: {
          titleKey: 'set_type_warmup_desc_title',
          descKey: 'set_type_warmup_desc'
      },
      drop: {
          titleKey: 'set_type_drop_desc_title',
          descKey: 'set_type_drop_desc'
      },
      failure: {
          titleKey: 'set_type_failure_desc_title',
          descKey: 'set_type_failure_desc'
      }
  } as const;

  const { titleKey, descKey } = content[setType];

  return (
    // FIX: Removed the `as TranslationKey` casts, which are no longer necessary due to the `as const` assertion.
    <Modal isOpen={isOpen} onClose={onClose} title={t(titleKey)}>
      <p className="text-text-secondary">{t(descKey)}</p>
    </Modal>
  );
};

export default SetTypeExplanationModal;
