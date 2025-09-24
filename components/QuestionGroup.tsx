import React from 'react';

interface QuestionGroupProps<T extends string> {
  title: string;
  options: T[];
  onSelect: (option: T | null) => void;
  selectedValue: T | null;
  disabled?: boolean;
}

export function QuestionGroup<T extends string,>({ title, options, onSelect, selectedValue, disabled = false }: QuestionGroupProps<T>) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(selectedValue === option ? null : option)}
            disabled={disabled}
            className={`
              w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${disabled ? 'cursor-not-allowed bg-slate-200 text-slate-400' : ''}
              ${selectedValue === option
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}