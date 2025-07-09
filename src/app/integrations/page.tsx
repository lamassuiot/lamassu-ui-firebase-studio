
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Blocks, PlusCircle, Loader2, AlertTriangle, Cloud, Settings, Eye, RefreshCw } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { discoverIntegrations, type DiscoveredIntegration } from '@/lib/integrations-api';

const IntegrationIcon: React.FC<{ type: DiscoveredIntegration['type'] }> = ({ type }) => {
    // For now, using a generic cloud icon. Can be expanded later.
    switch (type) {
        case 'AWS_IOT_CORE':
            return <Cloud className="h-6 w-6 text-orange-500" />;
        default:
            return <Blocks className="h-6 w-6 text-primary" />;
    }
};

export default function IntegrationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [integrations, setIntegrations] = useState<DiscoveredIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setError("User not authenticated.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
        const discovered = await discoverIntegrations(user.access_token);
        setIntegrations(discovered);
    } catch (err: any) {
        setError(err.message || 'An unknown error occurred while discovering integrations.');
    } finally {
        setIsLoading(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      loadIntegrations();
    }
  }, [authLoading, loadIntegrations]);

  const handleCreateNewIntegration = () => {
    router.push('/integrations/new');
  };

  const handleViewRa = (raId: string) => {
    router.push(`/registration-authorities/new?raId=${raId}`);
  };

  if (isLoading || authLoading) {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Discovering Integrations...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Blocks className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Platform Integrations</h1>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={loadIntegrations} variant="outline" disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button onClick={handleCreateNewIntegration}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Integration
            </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Discovered integrations with IoT platforms based on Registration Authority metadata.
      </p>

      {error && (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Integrations</AlertTitle>
            <AlertDescription>
                {error}
                <Button variant="link" onClick={loadIntegrations} className="p-0 h-auto ml-1">Try again?</Button>
            </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && integrations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <IntegrationIcon type={integration.type} />
                  <div>
                    <CardTitle>{integration.typeName}</CardTitle>
                    <CardDescription>
                      Linked to RA: <span className="font-semibold">{integration.raName}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 text-sm">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Config Key</p>
                        <Badge variant="outline" className="font-mono text-xs">{integration.configKey}</Badge>
                    </div>
                     <div>
                        <p className="text-xs font-medium text-muted-foreground">RA ID</p>
                        <p className="font-mono text-xs">{integration.raId}</p>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                 <div className="flex w-full justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewRa(integration.raId)}>
                        <Eye className="mr-2 h-4 w-4" /> View RA
                    </Button>
                    <Button variant="default" size="sm" onClick={() => alert(`Configure ${integration.typeName}`)}>
                        <Settings className="mr-2 h-4 w-4" /> Configure
                    </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && !error && (
            <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                <h3 className="text-lg font-semibold text-muted-foreground">No Integrations Found</h3>
                <p className="text-sm text-muted-foreground">
                No integrations discovered. Configure one by adding metadata to a Registration Authority.
                </p>
                <Button onClick={handleCreateNewIntegration} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Integration
                </Button>
            </div>
        )
      )}
    </div>
  );
}
