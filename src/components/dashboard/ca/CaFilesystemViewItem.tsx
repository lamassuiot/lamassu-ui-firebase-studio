
'use client';

import React, { useState } from 'react';
import type { CA } from '@/lib/ca-data';
import { Button } from "@/components/ui/button";
// Badge import removed as it's not used directly in this simplified status text logic
import { Landmark, ShieldAlert, ChevronRight, FileSearch, FilePlus2 } from 'lucide-react'; // Changed Folder, FolderOpen, FileWarning
import { formatDistanceToNowStrict, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const getExpiryTextAndSimplifiedStatus = (expires: string, status: CA['status']): { text: string; isWarning: boolean; isCritical: boolean } => {
  const expiryDate = parseISO(expires);
  let text = '';
  let isWarning = false;
  let isCritical = false;

  if (status === 'revoked') {
    text = `Revoked`;
    isCritical = true;
  } else if (isPast(expiryDate)) {
    text = `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
    isCritical = true;
  } else {
    text = `Expires in ${formatDistanceToNowStrict(expiryDate)}`;
    // Could add warning logic for upcoming expiry if needed
  }
  
  return { text: `${status.toUpperCase()} \u00B7 ${text}`, isWarning, isCritical };
};


interface CaFilesystemViewItemProps {
  ca: CA;
  level: number;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

export const CaFilesystemViewItem: React.FC<CaFilesystemViewItemProps> = ({ ca, level, router, allCAs }) => {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first few levels
  const hasChildren = ca.children && ca.children.length > 0;

  const { text: statusText, isCritical } = getExpiryTextAndSimplifiedStatus(ca.expires, ca.status);

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  
  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/details`);
  };

  const handleIssueCertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/issue-certificate`);
  };

  let IconComponent = Landmark; // Default to Landmark for CA
  if (isCritical) {
    IconComponent = ShieldAlert; // Use ShieldAlert for revoked/expired
  }


  return (
    <li className={cn("list-none rounded-md hover:bg-muted/50", level > 0 ? `ml-${level * 4}` : '')}>
      <div 
        className="flex items-center space-x-2 p-2 cursor-pointer"
        onClick={hasChildren ? handleToggleOpen : handleDetailsClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') hasChildren ? handleToggleOpen(e as any) : handleDetailsClick(e as any);}}
        aria-expanded={hasChildren ? isOpen : undefined}
      >
        {hasChildren && (
          <ChevronRight
            className={cn("h-4 w-4 text-muted-foreground transition-transform duration-150 flex-shrink-0", isOpen && "rotate-90")}
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} // Allow direct click on chevron too
          />
        )}
        {!hasChildren && <div className="w-4 h-4 flex-shrink-0"></div>} {/* Placeholder for alignment */}
        
        <IconComponent className={cn("h-5 w-5 flex-shrink-0", isCritical ? "text-destructive" : "text-primary")} />
        
        <div className="flex-grow min-w-0">
          <p className="text-sm font-medium truncate">{ca.name}</p>
          <p className={cn("text-xs truncate", isCritical ? "text-destructive" : "text-muted-foreground")}>{statusText}</p>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
           <Button variant="ghost" size="icon" onClick={handleDetailsClick} title={`Details for ${ca.name}`}>
                <FileSearch className="h-4 w-4" />
                <span className="sr-only">Details</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleIssueCertClick} title={`Issue certificate from ${ca.name}`}>
                <FilePlus2 className="h-4 w-4" />
                <span className="sr-only">Issue</span>
            </Button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <ul className="pl-4 border-l border-dashed border-border ml-4 py-1"> {/* Indent children and add guide line */}
          {ca.children?.map((childCa) => (
            <CaFilesystemViewItem
              key={childCa.id}
              ca={childCa}
              level={level + 1}
              router={router}
              allCAs={allCAs}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

