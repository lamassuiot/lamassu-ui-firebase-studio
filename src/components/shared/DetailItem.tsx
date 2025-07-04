'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DetailItemProps {
  label: string;
  value?: string | React.ReactNode;
  fullWidthValue?: boolean;
  isMono?: boolean;
  className?: string;
}

export const DetailItem: React.FC<DetailItemProps> = ({ label, value, fullWidthValue, isMono, className }) => {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  return (
    <div
      className={cn(
        `py-2 ${fullWidthValue ? 'grid grid-cols-1' : 'grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 items-baseline'}`,
        className
      )}
    >
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm text-foreground break-all min-w-0",
          fullWidthValue ? 'mt-1' : 'mt-1 sm:mt-0',
          isMono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  );
};
