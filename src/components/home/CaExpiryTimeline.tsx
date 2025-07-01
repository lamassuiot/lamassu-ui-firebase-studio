
'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { DataSet } from "vis-data/esnext";
import { Timeline } from "vis-timeline/esnext";
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { addDays, addMonths, isPast, parseISO, subDays, subMonths, toDate } from 'date-fns';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';


interface CaExpiryTimelineProps {
  cas: CA[];
  allCryptoEngines: ApiCryptoEngine[];
}

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas, allCryptoEngines }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hiddenItemsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const timelineInstance = useRef<Timeline | null>(null);
  const [renderedCount, setRenderedCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  const handleFullscreenToggle = () => {
    if (!cardRef.current) return;

    if (!document.fullscreenElement) {
      cardRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  const handleZoom = (range: '3m' | '1y' | '5y' | '10y' | '25y' | '50y') => {
    if (!timelineInstance.current) return;

    const now = new Date();
    let start: Date, end: Date;

    switch (range) {
      case '3m':
        start = subDays(now, 45);
        end = addDays(now, 45);
        break;
      case '1y':
        start = subMonths(now, 6);
        end = addMonths(now, 6);
        break;
      case '5y':
        start = subMonths(now, 30); // 2.5 years
        end = addMonths(now, 30);
        break;
      case '10y':
        start = subMonths(now, 60); // 5 years
        end = addMonths(now, 60);
        break;
      case '25y':
        start = subMonths(now, 150); // 12.5 years
        end = addMonths(now, 150);
        break;
      case '50y':
        start = subMonths(now, 300); // 25 years
        end = addMonths(now, 300);
        break;
    }
    
    timelineInstance.current.setWindow(start, end, { animation: true });
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (timelineInstance.current) {
      timelineInstance.current.redraw();
    }
  }, [isFullscreen]);


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
      height: '100%',
      margin: { item: 20 },
      start: subMonths(now, 1),
      end: addMonths(toDate(sortedCAs[0].expires), 3),
      zoomMin: 1000 * 60 * 60 * 24, // 1 day
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, // 100 years
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
  }, [cas, renderedCount, router]);

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

      <Card
        ref={cardRef}
        className={cn(
          "shadow-lg w-full bg-primary text-primary-foreground",
          isFullscreen && "h-screen flex flex-col"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Visual timeline of Certificate Authority expiry dates. Click an item to view details. Zoom in/out using mouse wheel or pinch gestures.
            </CardDescription>
          </div>
           <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1 rounded-md bg-primary-foreground/10 p-1">
                <Button size="sm" variant="ghost" onClick={() => handleZoom('3m')} className="h-7 px-2 text-xs text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground">3m</Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoom('1y')} className="h-7 px-2 text-xs text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground">1y</Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoom('5y')} className="h-7 px-2 text-xs text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground">5y</Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoom('10y')} className="h-7 px-2 text-xs text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground">10y</Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoom('25y')} className="h-7 px-2 text-xs text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground">25y</Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoom('50y')} className="h-7 px-2 text-xs text-primary-foreground/80 hover:bg-primary-foreground/20 hover:text-primary-foreground">50y</Button>
            </div>
            <Button variant="ghost" size="icon" onClick={handleFullscreenToggle} className="text-primary-foreground hover:bg-primary-foreground/20 focus-visible:ring-primary-foreground">
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                <span className="sr-only">Toggle Fullscreen</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className={cn(isFullscreen && "flex-grow")}>
          {cas.length > 0 ? (
            <div ref={timelineRef} className={cn("w-full", isFullscreen ? "h-full" : "h-[300px]")} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-primary-foreground/70">
              No CA data available to display in timeline.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
