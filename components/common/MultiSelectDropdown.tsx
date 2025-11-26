
import React, { useState, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useI18n } from '../../hooks/useI18n';

interface Option<T> {
  value: T;
  label: string;
}

interface MultiSelectDropdownProps<T> {
  options: Option<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  label: string;
  placeholder?: string;
}

export const MultiSelectDropdown = <T extends string>({ options, selected, onChange, label, placeholder }: MultiSelectDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useClickOutside(containerRef, () => setIsOpen(false));

  const filteredOptions = useMemo(() => {
    return options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const toggleOption = (value: T) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleRemove = (e: React.MouseEvent, value: T) => {
    e.stopPropagation();
    toggleOption(value);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface border border-white/10 rounded-xl p-3 text-left flex justify-between items-center focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm min-h-[3rem]"
      >
        <div className="flex flex-wrap gap-2 pr-2">
          {selected.length === 0 ? (
            <span className="text-text-secondary/50">{placeholder || t('common_select')}</span>
          ) : (
            selected.map(s => {
                const label = options.find(o => o.value === s)?.label || s;
                return (
                    <span key={s} className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                        {label}
                        <span onClick={(e) => handleRemove(e, s)} className="hover:text-white cursor-pointer">
                            <Icon name="x" className="w-3 h-3" />
                        </span>
                    </span>
                );
            })
          )}
        </div>
        <Icon name="arrow-down" className={`w-5 h-5 text-text-secondary transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-surface border border-white/10 rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary/50 focus:outline-none focus:border-primary/50"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-grow p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-primary/20 text-primary' : 'text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Icon name="check" className="w-4 h-4" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-text-secondary text-sm">
                {t('exercises_no_match')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
