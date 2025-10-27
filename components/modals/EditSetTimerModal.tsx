import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { formatSecondsToMMSS, parseTimerInput } from '../../utils/timeUtils';

interface EditSetTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number | undefined;
  defaultValue: number;
  onSave: (newTime: number | null) => void;
}

const EditSetTimerModal: React.FC<EditSetTimerModalProps> = ({ isOpen, onClose, currentValue, defaultValue, onSave }) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setInputValue(formatSecondsToMMSS(currentValue ?? defaultValue));
        }
    }, [isOpen, currentValue, defaultValue]);

    const handleSave = () => {
        const newTimeInSeconds = parseTimerInput(inputValue);
        if (newTimeInSeconds === defaultValue) {
            onSave(null); // Save null to signify using default
        } else {
            onSave(newTimeInSeconds);
        }
        onClose();
    };
    
    const handleReset = () => {
        onSave(null); // Send null to reset to default
        onClose();
    }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Rest Timer">
            <div className="space-y-4">
                <p className="text-sm text-text-secondary text-center">
                    Set a custom rest time for this set or reset to the default ({formatSecondsToMMSS(defaultValue)}).
                </p>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="w-full bg-slate-900 border border-primary rounded-lg p-3 text-center text-2xl font-mono"
                    placeholder="m:ss or secs"
                />
                <div className="flex flex-col space-y-2">
                    <button
                        onClick={handleSave}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg"
                    >
                        Save Custom Timer
                    </button>
                     <button
                        onClick={handleReset}
                        className="w-full bg-secondary text-white font-bold py-2 rounded-lg"
                    >
                        Reset to Default
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EditSetTimerModal;