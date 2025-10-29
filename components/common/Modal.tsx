import React, { ReactNode, useEffect } from 'react';
import { Icon } from './Icon';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/timeUtils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, contentClassName }) => {
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className={contentClassName || "bg-surface rounded-lg shadow-xl w-full max-w-sm sm:max-w-md m-2 sm:m-4 p-4 sm:p-6"}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
              <Icon name="x" />
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
