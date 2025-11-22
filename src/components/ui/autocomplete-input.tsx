'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface AutocompleteSuggestion {
  value: string;
  displayName: string;
  description?: string | null;
  examples?: string[];
  isPatternBased?: boolean | null;
}

export interface AutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  suggestions: AutocompleteSuggestion[];
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export function AutocompleteInput({
  suggestions,
  value,
  onChange,
  isLoading,
  className,
  placeholder,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value
  const filteredSuggestions = React.useMemo(() => {
    if (!value) return suggestions;
    const lowerValue = value.toLowerCase();
    return suggestions.filter(
      (s) =>
        s.value.toLowerCase().includes(lowerValue) ||
        s.displayName.toLowerCase().includes(lowerValue) ||
        s.description?.toLowerCase().includes(lowerValue) ||
        s.examples?.some((e) => e.toLowerCase().includes(lowerValue))
    );
  }, [suggestions, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    // If pattern-based, show an example or the value pattern
    if (suggestion.isPatternBased && suggestion.examples && suggestion.examples.length > 0) {
      onChange(suggestion.examples[0]);
    } else {
      onChange(suggestion.value);
    }
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          e.preventDefault();
          handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-suggestion]');
      const item = items[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('font-mono', className)}
        autoComplete="off"
        {...props}
      />

      {isOpen && (filteredSuggestions.length > 0 || isLoading) && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {isLoading ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              Loading suggestions...
            </div>
          ) : (
            filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion.value}
                data-suggestion
                className={cn(
                  'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                  highlightedIndex === index
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{suggestion.displayName}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {suggestion.value}
                  </span>
                </div>
                {suggestion.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {suggestion.description}
                  </p>
                )}
                {suggestion.isPatternBased && suggestion.examples && suggestion.examples.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    e.g., {suggestion.examples.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
