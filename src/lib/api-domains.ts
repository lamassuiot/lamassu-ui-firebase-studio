// src/lib/api-domains.ts
const getApiBaseUrl = (): string => {
    // Check if the configuration is available on the window object
    if (typeof window !== 'undefined' && (window as any).lamassuConfig?.LAMASSU_API) {
        return (window as any).lamassuConfig.LAMASSU_API;
    }
    // Fallback to a default value if not configured or in a server environment
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
