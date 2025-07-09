// public/env-config.js
window.lamassuConfig = {
    // Set this to false to disable authentication for local development
    LAMASSU_AUTH_ENABLED: true,
    
    // Keycloak / OIDC settings
    LAMASSU_AUTH_AUTHORITY: "https://lab.lamassu.io/auth/realms/lamassu",
    LAMASSU_AUTH_CLIENT_ID: "frontend",
    
    // API Gateway Base URL
    LAMASSU_API: "https://lab.lamassu.io/api"
};
