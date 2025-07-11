// src/lib/api-domains.ts
const getApiBaseUrl = (): string => {
    // 1. Check for configuration from env-config.js on the window object
    if (typeof window !== 'undefined' && (window as any).lamassuConfig?.LAMASSU_API) {
        return (window as any).lamassuConfig.LAMASSU_API;
    }
    // 2. Fallback to the Next.js public environment variable
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    // 3. Last resort fallback to a hardcoded default value
    return 'https://lab.lamassu.io/api';
};

const API_BASE_URL = getApiBaseUrl();

export const CA_API_BASE_URL = `${API_BASE_URL}/ca/v1`;
export const DEV_MANAGER_API_BASE_URL = `${API_BASE_URL}/devmanager/v1`;
export const DMS_MANAGER_API_BASE_URL = `${API_BASE_URL}/dmsmanager/v1`;
export const ALERTS_API_BASE_URL = `${API_BASE_URL}/alerts/v1`;
export const EST_API_BASE_URL = `${API_BASE_URL}/dmsmanager/.well-known/est`;
export const VA_CORE_API_BASE_URL = `${API_BASE_URL}/va`;
export const VA_API_BASE_URL = `${VA_CORE_API_BASE_URL}/v1`;

export const handleApiError = async (response: Response, defaultMessage: string) => {
    if (!response.ok) {
        let errorJson;
        let errorMessage = `${defaultMessage}. HTTP error ${response.status}`;
        try {
            errorJson = await response.json();
            if (errorJson && (errorJson.err || errorJson.message)) {
                errorMessage = `${defaultMessage}: ${errorJson.err || errorJson.message}`;
            }
        } catch (e) {
            console.error("Failed to parse error response as JSON:", e);
        }
        throw new Error(errorMessage);
    }
    return response.json();
};
