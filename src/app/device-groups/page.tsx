
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ServerCog, PlusCircle } from "lucide-react";

// Content from DeviceGroupsClient is now directly in this 'use client' page component
export default function DeviceGroupsPage() {
  const router = useRouter();

  const handleCreateNewGroup = () => {
    alert('Navigate to Create New Device Group form (placeholder)');
    // router.push('/device-groups/new'); // Example navigation if you had a /new page
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ServerCog className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Device Groups</h1>
        </div>
        <Button onClick={handleCreateNewGroup}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage groups of devices for easier policy application and organization.
      </p>

      <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
        <h3 className="text-lg font-semibold text-muted-foreground">No Device Groups Configured</h3>
        <p className="text-sm text-muted-foreground">
          Device groups will be listed here. This feature is currently under construction.
        </p>
        <Button onClick={handleCreateNewGroup} className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
        </Button>
      </div>
    </div>
  );
}
