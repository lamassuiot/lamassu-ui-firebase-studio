
'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = "Add tags...",
  className,
  id
}) => {
  const [inputValue, setInputValue] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const inputId = id || 'tag-input-field';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Optional: Remove last tag on backspace if input is empty
      // onChange(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        className="flex flex-wrap gap-2 items-center w-full rounded-md border border-input bg-card p-2 min-h-[2.5rem] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
      >
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1.5 text-sm py-1 px-2.5"
          >
            {tag}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation(); // Prevent focusing input when removing tag
                handleRemoveTag(tag);
              }}
              aria-label={`Remove tag ${tag}`}
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </Badge>
        ))}
        <Input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-grow h-auto p-0 m-0 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
          autoComplete="off"
        />
      </label>
       <p className="text-xs text-muted-foreground">Press Enter to add a tag. Click 'x' on a tag to remove it.</p>
    </div>
  );
};
