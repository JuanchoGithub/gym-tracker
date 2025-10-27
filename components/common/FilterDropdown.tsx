import React, { useState } from 'react';
import { Icon } from './Icon';

interface FilterOption<T> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T extends string> {
  options: FilterOption<T>[];
  selected: T;
  onSelect: (option: T) => void;
  label: string;
}

const FilterDropdown = <T extends string>({ options, selected, onSelect, label }: FilterDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: T) => {
    onSelect(option);
    setIsOpen(false);
  };

  const selectedLabel = options.find(o => o.value === selected)?.label || label;

  return (
    <div className="relative flex-grow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-surface border border-secondary/50 text-text-primary font-medium py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="truncate">{selectedLabel}</span>
        <Icon name="filter" className="w-5 h-5 ml-2 flex-shrink-0" />
      </button>

      {isOpen && (
        <div 
            className="absolute right-0 mt-2 w-full sm:w-48 bg-surface rounded-md shadow-lg z-20"
            onMouseLeave={() => setIsOpen(false)}
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left block px-4 py-2 text-sm ${
                  selected === option.value ? 'bg-primary/20 text-primary' : 'text-text-primary'
                } hover:bg-slate-700`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
