
'use client';

import React, { useState, useEffect, useId } from 'react';
import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface DurationInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  labelClassName?: string;
}

const DURATION_REGEX = /^\d+[smhdwy]$/;

export const DurationInput: React.FC<DurationInputProps> = ({
  label,
  value,
  onChange,
  description,
  className,
  labelClassName,
  ...props
}) => {
  const [isInvalid, setIsInvalid] = useState(false);
  const componentId = useId();
  const inputId = props.id || componentId;

  useEffect(() => {
    // An empty value is not considered invalid.
    if (value && !DURATION_REGEX.test(value)) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
    }
  }, [value]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className={cn(labelClassName, isInvalid && 'text-destructive')}>
        {label}
      </Label>
      <Input
        id={inputId}
        value={value}
        onChange={handleInputChange}
        className={cn(isInvalid && 'border-destructive focus-visible:ring-destructive', className)}
        {...props}
      />
      {description && !isInvalid && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {isInvalid && (
         <p className="text-xs text-destructive flex items-center">
            <AlertCircle className="h-3 w-3 mr-1"/>
            Invalid format. Must be a number followed by s, m, h, d, w, or y.
         </p>
      )}
    </div>
  );
};
