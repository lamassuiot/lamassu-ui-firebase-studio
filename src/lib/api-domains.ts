
// src/lib/api-domains.ts
const getApiBaseUrl = (): string => {
    // 1. Check for configuration from config.js on the window object
    if (typeof window !== 'undefined' && (window as any).lamassuConfig?.LAMASSU_API) {
        return (window as any).lamassuConfig.LAMASSU_API;
    }
    // 2. Fallback to the Next.js public environment variable
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    // 3. Return an empty string if no configuration is found
    return '';
};

const getVaEstApiBaseUrl = (): string => {
    // 1. Check for the specific override for VA/EST endpoints
    if (typeof window !== 'undefined' && (window as any).lamassuConfig?.LAMASSU_PUBLIC_API) {
        return (window as any).lamassuConfig.LAMASSU_PUBLIC_API;
    }
    // 2. Fallback to the main API base URL
    return getApiBaseUrl();
}

const API_BASE_URL = getApiBaseUrl();
const VA_EST_API_BASE_URL = getVaEstApiBaseUrl();

export const CA_API_BASE_URL = `${API_BASE_URL}/ca/v1`;
export const DEV_MANAGER_API_BASE_URL = `${API_BASE_URL}/devmanager/v1`;
export const DMS_MANAGER_API_BASE_URL = `${API_BASE_URL}/dmsmanager/v1`;
export const ALERTS_API_BASE_URL = `${API_BASE_URL}/alerts/v1`;

// These endpoints now use the potentially overridden base URL
export const EST_API_BASE_URL = `${VA_EST_API_BASE_URL}/dmsmanager/.well-known/est`;
export const VA_CORE_API_BASE_URL = `${VA_EST_API_BASE_URL}/va`;
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
