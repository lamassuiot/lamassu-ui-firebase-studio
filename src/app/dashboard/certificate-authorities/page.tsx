
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Landmark, ChevronRight, Minus, FileSearch, FilePlus2, PlusCircle, FolderTree, List, FolderKanban, Network, Loader2 } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData, getCaDisplayName } from '@/lib/ca-data';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from 'next/dynamic';

const CaFilesystemView = dynamic(() => 
  import('@/components/dashboard/ca/CaFilesystemView').then(mod => mod.CaFilesystemView), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading Filesystem View...</p>
      </div>
    )
  }
);

const CaHierarchyView = dynamic(() => 
  import('@/components/dashboard/ca/CaHierarchyView').then(mod => mod.CaHierarchyView), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading Hierarchy View...</p>
      </div>
    )
  }
);

type ViewMode = 'list' | 'filesystem' | 'hierarchy';

const getExpiryTextAndStatus = (expires: string, status: CA['status']): { text: string; badgeVariant: "default" | "secondary" | "destructive" | "outline"; badgeClass: string } => {
  const expiryDate = parseISO(expires);
  let text = '';
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let badgeClass = "";

  if (status === 'revoked') {
    text = `Revoked`;
    badgeVariant = "destructive";
    badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
  } else if (isPast(expiryDate)) {
    text = `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
    badgeVariant = "destructive";
    badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
  } else {
    text = `Expires in ${formatDistanceToNowStrict(expiryDate)}`;
    badgeVariant = "secondary"; 
    badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
  }
  
  return { text: `${status.toUpperCase()} \u00B7 ${text}`, badgeVariant, badgeClass };
};


const CaTreeItem: React.FC<{ ca: CA; level: number; router: ReturnType<typeof useRouter>; allCAs: CA[] }> = ({ ca, level, router, allCAs }) => {
  const [isOpen, setIsOpen] = React.useState(level < 1); 
  const hasChildren = ca.children && ca.children.length > 0;

  const { text: statusText, badgeVariant, badgeClass } = getExpiryTextAndStatus(ca.expires, ca.status);

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/details`);
  };

  const handleIssueCertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/issue-certificate`);
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      handleDetailsClick(e); // If no children, clicking the card goes to details
    }
  };
  
  const issuerDisplayName = getCaDisplayName(ca.issuer, allCAs);

  return (
    <li className={`py-1 list-none ${level > 0 ? 'pl-6 border-l border-dashed border-border ml-3' : ''} relative`}>
      {level > 0 && (
         <Minus className="h-3 w-3 absolute -left-[0.45rem] top-[calc(50%-0.375rem)] text-border transform rotate-90" />
      )}
      <div className="flex items-start space-x-2"> 
        <div className="flex-shrink-0 self-center pt-1"> 
          {hasChildren ? (
            <ChevronRight 
              className={`h-5 w-5 text-muted-foreground transition-transform duration-150 cursor-pointer ${isOpen ? 'rotate-90' : ''}`} 
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen);}}
            />
          ) : (
            <div className="w-5 h-5"></div> 
          )}
        </div>
        
        <Card 
          className={cn(
            "flex-1 w-full", 
            level === 0 ? "bg-card" : "bg-card/90",
            "border-0 shadow-none cursor-pointer" 
          )}
          onClick={handleToggleOpen} 
          role="button" tabIndex={0} 
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleOpen(e as any);}}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-label={hasChildren ? `${ca.name}, click to ${isOpen ? 'collapse' : 'expand'}` : ca.name}
        >
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center space-x-2">
              <FolderTree className="h-5 w-5 text-primary flex-shrink-0" />
              <CardTitle className="text-lg font-semibold">{ca.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1">
            <Badge variant={badgeVariant} className={cn("text-xs", badgeClass)}>{statusText}</Badge>
            <p className="text-xs text-muted-foreground">ID: <span className="font-mono select-all">{ca.id}</span></p>
            <p className="text-xs text-muted-foreground">Serial: <span className="font-mono select-all">{ca.serialNumber}</span></p>
            <p className="text-xs text-muted-foreground">Issuer: {issuerDisplayName === ca.name ? "Self-signed" : issuerDisplayName}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col space-y-1 self-center"> 
            <Button variant="outline" size="sm" onClick={handleDetailsClick} title={`Details for ${ca.name}`}>
                <FileSearch className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Details</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleIssueCertClick} title={`Issue certificate from ${ca.name}`}>
                <FilePlus2 className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Issue</span>
            </Button>
        </div>
      </div>
      {hasChildren && isOpen && (
        <ul className="mt-1">
          {ca.children?.map((childCa) => (
            <CaTreeItem key={childCa.id} ca={childCa} level={level + 1} router={router} allCAs={allCAs} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function CertificateAuthoritiesPage() {
  const router = useRouter(); 
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleCreateNewCAClick = () => {
    router.push('/dashboard/certificate-authorities/new');
  };

  const toggleViewMode = () => {
    setViewMode(prevMode => {
      if (prevMode === 'list') return 'filesystem';
      if (prevMode === 'filesystem') return 'hierarchy';
      return 'list'; // Cycle from hierarchy back to list
    });
  };
  
  let nextViewIcon = <List className="h-4 w-4" />;
  let nextViewText = "List View";
  let currentViewTitle = "List View";

  if (viewMode === 'list') {
    nextViewIcon = <FolderKanban className="h-4 w-4" />;
    nextViewText = "Filesystem View";
    currentViewTitle = "List View";
  } else if (viewMode === 'filesystem') {
    nextViewIcon = <Network className="h-4 w-4" />;
    nextViewText = "Hierarchy View";
    currentViewTitle = "Filesystem View";
  } else if (viewMode === 'hierarchy') {
    nextViewIcon = <List className="h-4 w-4" />;
    nextViewText = "List View";
    currentViewTitle = "Hierarchy View";
  }


  return (
    <div className="space-y-6 w-full">
      <div className="p-0"> 
        <div className="p-0"> 
          <div className="flex items-center justify-between mb-4"> 
            <div className="flex items-center space-x-3">
              <Landmark className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-headline font-semibold">Certificate Authorities</h1> 
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={toggleViewMode} title={`Switch to ${nextViewText}`}>
                {nextViewIcon}
                <span className="ml-2 hidden sm:inline">{nextViewText}</span>
              </Button>
              <Button variant="default" onClick={handleCreateNewCAClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New CA
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Currently viewing CAs in: <span className="font-semibold">{currentViewTitle}</span>. Manage your Certificate Authority configurations and trust stores.</p> 
        </div>
        <div className="pt-6"> 
          {certificateAuthoritiesData.length > 0 ? (
            <>
              {viewMode === 'list' && (
                <ul className="space-y-2">
                  {certificateAuthoritiesData.map((ca) => (
                    <CaTreeItem key={ca.id} ca={ca} level={0} router={router} allCAs={certificateAuthoritiesData} />
                  ))}
                </ul>
              )}
              {viewMode === 'filesystem' && (
                <CaFilesystemView cas={certificateAuthoritiesData} router={router} allCAs={certificateAuthoritiesData} />
              )}
              {viewMode === 'hierarchy' && (
                <CaHierarchyView cas={certificateAuthoritiesData} router={router} allCAs={certificateAuthoritiesData} />
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No Certificate Authorities configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}

