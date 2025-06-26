
'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { DataSet } from "vis-data/esnext";
import { Timeline } from "vis-timeline/esnext";
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { addMonths, isPast, parseISO, subMonths } from 'date-fns';

interface CaExpiryTimelineProps {
  cas: CA[];
}

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const items = useMemo(() => {
    return new DataSet(
      cas.map(ca => {
        const expiryDate = parseISO(ca.expires);
        const isEventExpired = isPast(expiryDate);
        let className = 'item-active';

        if (ca.status === 'revoked') {
          className = 'item-revoked';
        } else if (isEventExpired) {
          className = 'item-expired';
        }

        return {
          id: ca.id,
          content: ca.name,
          start: expiryDate,
          className: className,
        };
      })
    );
  }, [cas]);

  useEffect(() => {
    if (timelineRef.current && items.length > 0) {
      const now = new Date();
      const options = {
        stack: true, // Changed to true to keep items in a single group
        width: '100%',
        height: '300px',
        margin: {
          item: 20
        },
        start: subMonths(now, 1),
        end: addMonths(now, 6),
        zoomMin: 1000 * 60 * 60 * 24 * 7, // 1 week
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
      };

      const timeline = new Timeline(timelineRef.current, items, options);
      
      timeline.on('select', properties => {
        if (properties.items.length > 0) {
          const caId = properties.items[0];
          router.push(`/certificate-authorities/details?caId=${caId}`);
        }
      });
      
      timeline.addCustomTime(now, 'now-marker');

      return () => {
        timeline.destroy();
      };
    }
  }, [items, router]);

  return (
    <Card className="shadow-lg w-full">
        <CardHeader>
            <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
            <CardDescription>Visual timeline of Certificate Authority expiry dates. Click an item to view details.</CardDescription>
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
  );
};
