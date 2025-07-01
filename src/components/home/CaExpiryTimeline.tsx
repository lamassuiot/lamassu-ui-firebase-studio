'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { DataSet } from "vis-data/esnext";
import { Timeline } from "vis-timeline/esnext";
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { addMonths, isPast, parseISO, subMonths, toDate } from 'date-fns';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { createRoot } from 'react-dom/client';

interface CaExpiryTimelineProps {
  cas: CA[];
  allCryptoEngines: ApiCryptoEngine[];
}

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas, allCryptoEngines }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const hiddenItemsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const timelineInstance = useRef<Timeline | null>(null);
  const [renderedCount, setRenderedCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!timelineRef.current || cas.length === 0 || renderedCount < cas.length) {
      return;
    }

    if (timelineInstance.current) {
      timelineInstance.current.destroy();
      timelineInstance.current = null;
    }

    const sortedCAs = [...cas].sort((a, b) => {
      const dateA = parseISO(a.expires);
      const dateB = parseISO(b.expires);
      return dateA.getTime() - dateB.getTime();
    });

    const itemsData = sortedCAs.map(ca => {
      const expiryDate = parseISO(ca.expires);
      const isEventExpired = isPast(expiryDate);
      let className = 'item-active';

      if (ca.status === 'revoked') {
        className = 'item-revoked';
      } else if (isEventExpired) {
        className = 'item-expired';
      }

      const contentElement = hiddenItemsRef.current.get(ca.id);
      if (!contentElement) {
        console.warn(`Could not find pre-rendered element for CA ${ca.id}`);
        return null;
      }

      return {
        id: ca.id,
        content: contentElement,
        start: expiryDate,
        className,
      };
    }).filter(Boolean);

    if (itemsData.length === 0) return;

    const items = new DataSet(itemsData as any);
    const now = new Date();
    const options = {
      stack: true,
      width: '100%',
      height: '300px',
      margin: { item: 20 },
      start: subMonths(now, 1),
      end: addMonths(toDate(sortedCAs[0].expires), 3),
      zoomMin: 1000 * 60 * 60 * 24, // 1 day
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 15, // 10 years
    };

    const timeline = new Timeline(timelineRef.current, items, options);
    timelineInstance.current = timeline;

    timeline.on('select', properties => {
      if (properties.items.length > 0) {
        const caId = properties.items[0];
        router.push(`/certificate-authorities/details?caId=${caId}`);
      }
    });

    timeline.addCustomTime(now, 'now-marker');

    return () => {
      if (timelineInstance.current) {
        timelineInstance.current.destroy();
        timelineInstance.current = null;
        console.log("Destroyed existing timeline");
      }
    };
  }, [cas, renderedCount]);

  return (
    <>
      {/* Hidden container for pre-rendering item content */}
      <div style={{ display: 'none' }}>
        {cas.map(ca => (
          <div
            key={`vis-item-for-${ca.id}`}
            ref={el => {
              if (el && !hiddenItemsRef.current.has(ca.id)) {
                hiddenItemsRef.current.set(ca.id, el);
                setRenderedCount(prev => prev + 1);
              }
            }}
            id={`vis-item-content-${ca.id}`}
          >
            <CaVisualizerCard ca={ca} allCryptoEngines={allCryptoEngines} />
          </div>
        ))}
      </div>

      <Card className="shadow-lg w-full bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Visual timeline of Certificate Authority expiry dates. Click an item to view details. Zoom in/out using mouse wheel or pinch gestures.
          </CardDescription>
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