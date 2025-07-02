// src/lib/api-domains.ts
const API_BASE_URL = 'https://lab.lamassu.io/api';

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
