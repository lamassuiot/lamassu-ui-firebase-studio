
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, ChevronRight, Minus, FileSearch, FilePlus2, PlusCircle } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData, getCaDisplayName } from '@/lib/ca-data';
import { CaVisualizerCard } from '@/components/CaVisualizerCard'; // Import the new component

// Recursive component to render each CA and its children
const CaTreeItem: React.FC<{ ca: CA; level: number; router: ReturnType<typeof useRouter>; allCAs: CA[] }> = ({ ca, level, router, allCAs }) => {
  const [isOpen, setIsOpen] = React.useState(level < 1); // Expand first level by default

  const hasChildren = ca.children && ca.children.length > 0;

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/details`);
  };

  const handleIssueCertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/issue-certificate`);
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent details click if clicking on the card to expand
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      // If no children, card click can go to details
      handleDetailsClick(e);
    }
  };

  return (
    <li className={`py-1 list-none ${level > 0 ? 'pl-6 border-l border-dashed border-border ml-3' : ''} relative`}>
      {level > 0 && (
         <Minus className="h-3 w-3 absolute -left-[0.45rem] top-1/2 -translate-y-1/2 text-border transform rotate-90" />
      )}
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0 self-start pt-3"> {/* Aligns chevron with the card */}
          {hasChildren ? (
            <ChevronRight 
              className={`h-5 w-5 text-muted-foreground transition-transform duration-150 cursor-pointer ${isOpen ? 'rotate-90' : ''}`} 
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen);}}
            />
          ) : (
            <div className="w-5 h-5"></div> // Placeholder for alignment
          )}
        </div>
        
        <div className="flex-1" onClick={handleToggleOpen} role="button" tabIndex={0} 
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleOpen(e as any);}}
             aria-expanded={hasChildren ? isOpen : undefined}
             aria-label={hasChildren ? `${ca.name}, click to ${isOpen ? 'collapse' : 'expand'}` : ca.name}
        >
          <CaVisualizerCard ca={ca} />
        </div>

        <div className="flex flex-col space-y-1 self-start"> {/* Action buttons aligned to the card */}
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

  const handleCreateNewCAClick = () => {
    router.push('/dashboard/certificate-authorities/new');
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="shadow-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Landmark className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-headline">Certificate Authorities</CardTitle>
            </div>
            <Button variant="default" onClick={handleCreateNewCAClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New CA
            </Button>
          </div>
          <CardDescription>Manage your Certificate Authority (CA) configurations and trust stores. Click on a CA card to expand/collapse if it has sub-CAs.</CardDescription>
        </CardHeader>
        <CardContent>
          {certificateAuthoritiesData.length > 0 ? (
            <ul className="space-y-2"> {/* Increased spacing between items */}
              {certificateAuthoritiesData.map((ca) => (
                <CaTreeItem key={ca.id} ca={ca} level={0} router={router} allCAs={certificateAuthoritiesData} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No Certificate Authorities configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
