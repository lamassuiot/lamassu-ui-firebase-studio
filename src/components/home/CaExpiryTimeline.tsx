
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

interface TimelineGroup {
    id: CA['status'] | 'expired';
    content: string;
}

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { items, groups } = useMemo(() => {
    const timelineGroups = new DataSet<TimelineGroup>([
        { id: 'active', content: 'Active CAs' },
        { id: 'expired', content: 'Expired CAs' },
        { id: 'revoked', content: 'Revoked CAs' },
    ]);

    const timelineItems = new DataSet(
      cas.map(ca => {
        const expiryDate = parseISO(ca.expires);
        const isEventExpired = isPast(expiryDate);
        let statusGroup: TimelineGroup['id'] = 'active';
        let className = 'item-active';

        if (ca.status === 'revoked') {
          statusGroup = 'revoked';
          className = 'item-revoked';
        } else if (isEventExpired) {
          statusGroup = 'expired';
          className = 'item-expired';
        }

        return {
          id: ca.id,
          content: ca.name,
          start: expiryDate,
          group: statusGroup,
          type: 'point',
          className: className,
        };
      })
    );

    return { items: timelineItems, groups: timelineGroups };
  }, [cas]);

  useEffect(() => {
    if (timelineRef.current && items.length > 0) {
      const now = new Date();
      const options = {
        stack: false,
        width: '100%',
        height: '300px',
        margin: {
          item: 20
        },
        orientation: {
          axis: 'top'
        },
        start: subMonths(now, 1),
        end: addMonths(now, 6),
        zoomMin: 1000 * 60 * 60 * 24 * 7, // 1 week
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
      };

      const timeline = new Timeline(timelineRef.current, items, groups, options);
      
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
  }, [items, groups, router]);

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
