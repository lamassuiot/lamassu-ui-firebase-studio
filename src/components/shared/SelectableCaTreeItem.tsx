
'use client';

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { FolderTree, ChevronRight, Minus } from "lucide-react";
import type { CA } from '@/lib/ca-data'; // Assuming CA type is defined here
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface SelectableCaTreeItemProps {
  ca: CA;
  level: number;
  onSelect: (ca: CA) => void; // For single-selection mode
  currentSingleSelectedCaId?: string | null; // If in single selection mode
  showCheckbox?: boolean;
  isMultiSelected?: boolean; // This will be true if THIS ca is in the multi-select list
  onMultiSelectToggle?: (ca: CA, isSelected: boolean) => void; // For multi-selection mode
  _currentMultiSelectedCAsPassedToDialog?: CA[]; // The full list of multi-selected CAs for checking children
}

export const SelectableCaTreeItem: React.FC<SelectableCaTreeItemProps> = ({ 
  ca, 
  level, 
  onSelect, 
  currentSingleSelectedCaId,
  showCheckbox, 
  isMultiSelected, 
  onMultiSelectToggle,
  _currentMultiSelectedCAsPassedToDialog
}) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Auto-open first level
  const hasChildren = ca.children && ca.children.length > 0;

  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showCheckbox && onMultiSelectToggle) {
        onMultiSelectToggle(ca, !isMultiSelected);
    } else {
      onSelect(ca);
    }
  };

  const isCurrentlySelected = !showCheckbox && currentSingleSelectedCaId === ca.id;
  const timeToExpire = ca.expires ? formatDistanceToNowStrict(parseISO(ca.expires), { addSuffix: true }) : 'N/A';

  return (
    <li className={`py-1 ${level > 0 ? 'pl-4 border-l border-dashed border-border ml-2' : ''} relative list-none`}>
      {level > 0 && <Minus className="h-3 w-3 absolute -left-[0.4rem] top-3 text-border transform rotate-90" />}
      <div 
        className={cn(
            "flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer",
            (isCurrentlySelected || isMultiSelected) && 'bg-primary/10'
        )}
        onClick={handleItemClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(e as any);}}
        aria-selected={isCurrentlySelected || isMultiSelected}
      >
        {showCheckbox && (
          <Input 
            type="checkbox" 
            checked={!!isMultiSelected} 
            onChange={(e) => {
              e.stopPropagation(); 
              if (onMultiSelectToggle) onMultiSelectToggle(ca, e.target.checked);
            }} 
            className="h-4 w-4 mr-1 accent-primary shrink-0"
            aria-label={`Select CA ${ca.name}`}
          />
        )}
        {hasChildren && (
          <ChevronRight 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-90' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            aria-expanded={isOpen}
            aria-label={isOpen ? `Collapse ${ca.name}` : `Expand ${ca.name}`}
          />
        )}
        {/* Adjust placeholder for alignment based on checkbox presence */}
        {!hasChildren && !showCheckbox && <div className="w-4 shrink-0"></div>}
        {!hasChildren && showCheckbox && <div className="w-0 shrink-0"></div>} 
        
        <FolderTree className="h-4 w-4 text-primary flex-shrink-0" />
        <span className={`flex-1 text-sm truncate ${ isCurrentlySelected || isMultiSelected ? 'font-semibold text-primary': ''}`}>
          {ca.name} 
          <span className="text-xs text-muted-foreground">
            (ID: {ca.id.substring(0,8)}... - {timeToExpire})
          </span>
        </span>
      </div>
      {hasChildren && isOpen && (
        <ul className="mt-1 pl-3">
          {ca.children?.map((childCa) => (
            <SelectableCaTreeItem 
              key={childCa.id} 
              ca={childCa} 
              level={level + 1} 
              onSelect={onSelect}
              currentSingleSelectedCaId={currentSingleSelectedCaId}
              showCheckbox={showCheckbox}
              isMultiSelected={!!(showCheckbox && _currentMultiSelectedCAsPassedToDialog?.some(sel => sel.id === childCa.id))}
              onMultiSelectToggle={onMultiSelectToggle}
              _currentMultiSelectedCAsPassedToDialog={_currentMultiSelectedCAsPassedToDialog}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
