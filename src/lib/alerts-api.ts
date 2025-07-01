// src/lib/alerts-api.ts

'use client'; // This can be a client-side library function

export interface ApiAlertEventData {
    specversion: string;
    id: string;
    source: string;
    type: string;
    datacontenttype: string;
    time: string;
    data: object;
}

export interface ApiAlertEvent {
    event_types: string;
    event: ApiAlertEventData;
    seen_at: string;
    counter: number;
}

export interface ApiSubscription {
    id: string;
    user_id: string;
    event_type: string;
    subscription_ts: string;
    conditions: {
        type: string;
        condition: string;
    }[];
    channel: {
        type: 'EMAIL'; // Assuming only EMAIL for now
        name: string;
        config: {
            email: string;
        };
    };
}


export async function fetchLatestAlerts(accessToken: string): Promise<ApiAlertEvent[]> {
  const response = await fetch('https://lab.lamassu.io/api/alerts/v1/events/latest', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let errorJson;
    let errorMessage = `Failed to fetch alerts. HTTP error ${response.status}`;
    try {
      errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = `Failed to fetch alerts: ${errorJson.message}`;
      }
    } catch (e) {
      console.error("Failed to parse error response as JSON for alerts:", e);
    }
    throw new Error(errorMessage);
  }

  const data: ApiAlertEvent[] = await response.json();
  return data;
}

export async function fetchSystemSubscriptions(accessToken: string): Promise<ApiSubscription[]> {
  const response = await fetch('https://lab.lamassu.io/api/alerts/v1/user/_lms_system/subscriptions', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let errorJson;
    let errorMessage = `Failed to fetch subscriptions. HTTP error ${response.status}`;
     try {
      errorJson = await response.json();
      if (errorJson && errorJson.message) {
        errorMessage = `Failed to fetch subscriptions: ${errorJson.message}`;
      }
    } catch (e) {
      console.error("Failed to parse error response as JSON for subscriptions:", e);
    }
    throw new Error(errorMessage);
  }

  const data: ApiSubscription[] = await response.json();
  return data;
}
