// src/lib/integrations-api.ts
'use client';

import { fetchAllRegistrationAuthorities, type ApiRaItem } from './dms-api';

export type IntegrationType = 'AWS_IOT_CORE' | 'UNKNOWN';

export interface DiscoveredIntegration {
  id: string; // Composite key: ra.id + metadata key
  raId: string;
  raName: string;
  type: IntegrationType;
  typeName: string; // User-friendly name like "AWS IoT Core"
  configKey: string;
  config: any; // The value from the metadata
}

export async function discoverIntegrations(accessToken: string): Promise<DiscoveredIntegration[]> {
  const allRAs = await fetchAllRegistrationAuthorities(accessToken);
  const integrations: DiscoveredIntegration[] = [];

  for (const ra of allRAs) {
    if (ra.metadata) {
      for (const key in ra.metadata) {
        if (key.startsWith('lamassu.io/iot/')) {
          let type: IntegrationType = 'UNKNOWN';
          let typeName = 'Unknown IoT Platform';

          if (key.startsWith('lamassu.io/iot/aws.')) {
            type = 'AWS_IOT_CORE';
            typeName = 'AWS IoT Core';
          }
          
          integrations.push({
            id: `${ra.id}-${key}`,
            raId: ra.id,
            raName: ra.name,
            type: type,
            typeName: typeName,
            configKey: key,
            config: ra.metadata[key],
          });
        }
      }
    }
  }

  return integrations;
}
