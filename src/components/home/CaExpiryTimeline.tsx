
'use client';

import React, { useEffect, useRef } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { DataSet } from "vis-data/esnext";
import { Timeline } from "vis-timeline/esnext";
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { addMonths, isPast, parseISO, subMonths } from 'date-fns';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import type { ApiCryptoEngine } from '@/types/crypto-engine';

interface CaExpiryTimelineProps {
  cas: CA[];
  allCryptoEngines: ApiCryptoEngine[];
}

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas, allCryptoEngines }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!timelineRef.current || cas.length === 0) {
      return;
    }

    const itemsData = cas.map(ca => {
      const expiryDate = parseISO(ca.expires);
      const isEventExpired = isPast(expiryDate);
      let className = 'item-active';

      if (ca.status === 'revoked') {
        className = 'item-revoked';
      } else if (isEventExpired) {
        className = 'item-expired';
      }
      
      const contentElement = document.getElementById(`vis-item-content-${ca.id}`);
      if (!contentElement) {
        console.warn(`Could not find pre-rendered element for CA ${ca.id}`);
        return null;
      }

      return {
        id: ca.id,
        content: contentElement,
        start: expiryDate,
        className: className,
      };
    }).filter(Boolean); // Filter out any null items if element wasn't found

    if (itemsData.length === 0) return;

    const items = new DataSet(itemsData as any);

    const now = new Date();
    
    const options = {
      stack: true, 
      width: '100%',
      height: '300px',
      margin: {
        item: 20
      },
      start: subMonths(now, 3), 
      end: addMonths(now, 6),
      zoomMin: 1000 * 60 * 60 * 24 * 30, // 1 month
      zoomMax: 1000 * 60 * 60 * 24 * 20, // 20 years
    };

    const timeline = new Timeline(timelineRef.current, items, options);
    
    timeline.addCustomTime(now, 'now-marker');
    
    timeline.on('select', properties => {
      if (properties.items.length > 0) {
        const caId = properties.items[0];
        router.push(`/certificate-authorities/details?caId=${caId}`);
      }
    });
    
    return () => {
      timeline.destroy();
    };
  }, [cas, router, allCryptoEngines]);


  return (
    <>
      {/* Hidden container for React to pre-render timeline item content */}
      <div style={{ display: 'none' }}>
        {cas.map(ca => (
          <div id={`vis-item-content-${ca.id}`} key={`vis-item-for-${ca.id}`}>
            <CaVisualizerCard ca={ca} allCryptoEngines={allCryptoEngines} />
          </div>
        ))}
      </div>

      <Card className="shadow-lg w-full bg-card text-card-foreground">
          <CardHeader>
              <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
              <CardDescription className="text-muted-foreground">Visual timeline of Certificate Authority expiry dates. Click an item to view details.</CardDescription>
          </CardHeader>
          <CardContent>
            {cas.length > 0 ? (
              <div ref={timelineRef} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No CA data available to display in timeline.
              </div>
            )}
          </CardContent>
      </Card>
    </>
  );
};
