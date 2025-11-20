
import React, { useState, Dispatch, SetStateAction, useRef } from 'react';
import { Icon } from './Icon';
import { useClickOutside } from '../../hooks/useClickOutside';

interface FilterOption<T> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T extends string> {
  options: FilterOption<T>[];
  selected: T;
  onSelect: Dispatch<SetStateAction<T>>;
  label: string;
  align?: 'left' | 'right';
}

const FilterDropdown = <T extends string>({ options, selected, onSelect, label, align = 'left' }: FilterDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleSelect = (option: T) => {
    onSelect(option);
    setIsOpen(false);
  };

  const selectedLabel = options.find(o => o.value === selected)?.label || label;

  return (
    <div className="relative flex-grow" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-surface border border-white/10 text-text-primary font-medium py-2.5 px-4 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-surface-highlight/50"
      >
        <span className="truncate text-sm">{selectedLabel}</span>
        <Icon name="filter" className="w-4 h-4 ml-2 flex-shrink-0 opacity-70" />
      </button>

      {isOpen && (
        <div 
            className={`absolute mt-2 w-full sm:w-56 bg-surface border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left block px-4 py-3 text-sm transition-colors ${
                  selected === option.value ? 'bg-primary/10 text-primary font-semibold' : 'text-text-primary hover:bg-white/5'
                }`}
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
