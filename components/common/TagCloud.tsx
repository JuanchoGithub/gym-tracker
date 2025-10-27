import React from 'react';

interface TagOption<T> {
  value: T;
  label: string;
}

interface TagCloudProps<T extends string> {
  options: ReadonlyArray<TagOption<T>>;
  selected: T;
  onSelect: (option: T) => void;
  disabled?: boolean;
}

const TagCloud = <T extends string>({ options, selected, onSelect, disabled }: TagCloudProps<T>) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === option.value
              ? 'bg-primary text-white'
              : 'bg-surface hover:bg-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TagCloud;
