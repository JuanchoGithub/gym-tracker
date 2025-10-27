import React from 'react';

interface TagCloudProps<T extends string> {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  disabled?: boolean;
}

const TagCloud = <T extends string>({ options, selected, onSelect, disabled }: TagCloudProps<T>) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === option
              ? 'bg-primary text-white'
              : 'bg-surface hover:bg-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default TagCloud;
