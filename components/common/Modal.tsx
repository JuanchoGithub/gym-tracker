import React, { ReactNode } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-lg shadow-xl w-full max-w-sm sm:max-w-md m-4 p-4 sm:p-6"
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