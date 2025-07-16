
'use client';

import React, { useState } from 'react';
import { ChevronRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Asn1Json {
  tag: {
    tagClass: number;
    tagNumber: number;
    isConstructed: boolean;
  };
  name: string;
  value?: any; // Can be string, number, or another object/array
  len: number;
  sub?: Asn1Json[];
}

interface Asn1ViewerProps {
  data: Asn1Json;
}

const tagClassMap: { [key: number]: string } = {
  0: 'U', // Universal
  1: 'A', // Application
  2: 'C', // Context-specific
  3: 'P', // Private
};

const Asn1Node: React.FC<{ node: Asn1Json; level: number; isLast: boolean }> = ({ node, level, isLast }) => {
  const [isOpen, setIsOpen] = useState(level < 4);
  const hasChildren = node.sub && node.sub.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const tagClass = tagClassMap[node.tag.tagClass] || '?';
  const tagName = node.name || 'Unknown';
  const tagNumber = node.tag.tagNumber;
  const tagDisplay = node.tag.tagClass === 0 ? tagName : `[${tagNumber}]`;
  const tagColor = node.tag.isConstructed ? 'text-blue-500' : 'text-green-600';

  let valueDisplay = '';
  if (node.value !== undefined) {
    if (typeof node.value === 'string' && node.value.length > 100) {
      valueDisplay = `${node.value.substring(0, 100)}...`;
    } else if (typeof node.value === 'string') {
      valueDisplay = node.value;
    } else {
        valueDisplay = JSON.stringify(node.value);
    }
  }

  return (
    <div className="relative font-mono text-xs">
      <div
        className="flex items-center py-0.5"
        style={{ paddingLeft: `${level * 1.25}rem` }}
      >
        <div className="absolute left-0 top-0 h-full" style={{ marginLeft: `${level * 1.25 - 0.75}rem` }}>
          {Array.from({ length: level }).map((_, i) => (
            <span key={i} className="absolute border-l border-muted-foreground/30" style={{ left: `${i * 1.25}rem`, height: '100%' }}></span>
          ))}
        </div>

        {level > 0 && <Minus className="absolute h-3 w-3 -left-1.5 top-1.5 transform -translate-x-full text-muted-foreground/50" style={{ marginLeft: `${level * 1.25}rem` }} />}

        {hasChildren ? (
          <ChevronRight
            onClick={handleToggle}
            className={cn('h-4 w-4 mr-1 cursor-pointer transition-transform shrink-0', isOpen && 'rotate-90')}
          />
        ) : (
          <span className="w-5 mr-1 shrink-0" />
        )}

        <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={cn('font-bold', tagColor)}>{tagDisplay}</span>
            <span className="text-muted-foreground">{node.tag.isConstructed ? 'SEQUENCE' : 'PRIMITIVE'}</span>
            <span className="text-gray-500">({node.len} byte{node.len !== 1 ? 's' : ''})</span>
            {valueDisplay && <span className="text-blue-700 dark:text-blue-400 break-all">{valueDisplay}</span>}
        </div>
      </div>
      {hasChildren && isOpen && (
        <div className="pl-2">
          {node.sub?.map((child, index) => (
            <Asn1Node key={index} node={child} level={level + 1} isLast={index === (node.sub?.length ?? 0) - 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Asn1Viewer: React.FC<Asn1ViewerProps> = ({ data }) => {
  return (
    <ScrollArea className="h-[40rem] w-full rounded-md border p-2 bg-card">
      <Asn1Node node={data} level={0} isLast={true} />
    </ScrollArea>
  );
};
