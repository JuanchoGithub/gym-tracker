import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-primary' : 'bg-secondary'}`}
      aria-pressed={checked}
    >
      <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

export default ToggleSwitch;
