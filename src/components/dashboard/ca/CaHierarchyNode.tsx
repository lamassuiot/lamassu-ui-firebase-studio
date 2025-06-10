
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { FileSearch, FilePlus2, Landmark } from 'lucide-react';
import { formatDistanceToNowStrict, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface CaHierarchyNodeProps {
  ca: CA;
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

const getExpiryTextAndStatusVisuals = (expires: string, status: CA['status']): { text: string; badgeVariant: "default" | "secondary" | "destructive" | "outline"; badgeClass: string } => {
  const expiryDate = parseISO(expires);
  let text = '';
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";
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

export const CaHierarchyNode: React.FC<CaHierarchyNodeProps> = ({ ca, router, allCAs }) => {
  const { text: statusText, badgeVariant, badgeClass } = getExpiryTextAndStatusVisuals(ca.expires, ca.status);

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/details`);
  };

  const handleIssueCertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/issue-certificate`);
  };

  const hasChildren = ca.children && ca.children.length > 0;

  return (
    <div className="inline-flex flex-col items-center p-1 relative group"> {/* Node container */}
      {/* CA Card */}
      <Card className="min-w-[180px] max-w-[200px] w-auto shadow-md hover:shadow-lg transition-shadow bg-card z-10">
        <CardHeader className="p-2 border-b">
          <div className="flex items-center space-x-1.5">
            <Landmark className="h-4 w-4 text-primary flex-shrink-0" />
            <CardTitle className="text-xs font-semibold truncate" title={ca.name}>{ca.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-2 text-[10px] space-y-1">
          <Badge variant={badgeVariant} className={cn("text-[9px] w-full justify-center py-0.5 leading-tight", badgeClass)}>{statusText}</Badge>
        </CardContent>
        <CardFooter className="p-1.5 flex justify-center space-x-1 border-t mt-1 pt-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDetailsClick} title={`Details for ${ca.name}`}>
              <FileSearch className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleIssueCertClick} title={`Issue certificate from ${ca.name}`}>
              <FilePlus2 className="h-3 w-3" />
          </Button>
        </CardFooter>
      </Card>

      {/* Children Rendering Area */}
      {hasChildren && (
        <div className="mt-8 flex flex-row flex-wrap justify-center items-start gap-x-6 gap-y-8 relative"> {/* Children container */}
          {/* Simple line from parent to this container - centered above */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-[-32px] w-px h-8 bg-border group-hover:bg-primary transition-colors"></div>

          {ca.children.map((childCa) => (
            <div key={childCa.id} className="relative">
              {/* Simple line from top of this div to this child node (from its parent group) */}
               <div className="absolute left-1/2 transform -translate-x-1/2 top-[-32px] w-px h-8 bg-border group-hover:bg-primary transition-colors"></div>
              <CaHierarchyNode ca={childCa} router={router} allCAs={allCAs} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
