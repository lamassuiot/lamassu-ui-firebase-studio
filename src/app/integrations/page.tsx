'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Blocks, PlusCircle } from "lucide-react";

export default function IntegrationsPage() {

  const handleCreateNewIntegration = () => {
    alert('Navigate to Create New Integration form (placeholder)');
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Blocks className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Platform Integrations</h1>
        </div>
        <Button onClick={handleCreateNewIntegration}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Integration
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure integrations with IoT platforms like AWS IoT Core, EMQX, and Azure IoT Hub for your Registration Authorities.
      </p>

      <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
        <h3 className="text-lg font-semibold text-muted-foreground">No Integrations Configured</h3>
        <p className="text-sm text-muted-foreground">
          Platform integrations will be listed here. This feature is currently under construction.
        </p>
        <Button onClick={handleCreateNewIntegration} className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Integration
        </Button>
      </div>
    </div>
  );
}
