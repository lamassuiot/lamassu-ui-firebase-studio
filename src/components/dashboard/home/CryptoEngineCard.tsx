
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound } from 'lucide-react'; // Or Lock, HardDrive depending on preference

export function CryptoEngineCard() {
  return (
    <Card className="bg-primary text-primary-foreground shadow-xl h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
          Crypto Engines
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-500 rounded-md"> {/* Red background for the icon like in image */}
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-primary-foreground">Amazon Web Services</p>
            <p className="text-sm text-primary-foreground/90">KMS</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
          DEFAULT ENGINE
        </Badge>
      </CardContent>
    </Card>
  );
}
