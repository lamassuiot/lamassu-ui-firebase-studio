// This file allows for runtime configuration of the Lamassu UI.
// You can override these values in your deployment environment without rebuilding the app.
window.lamassuConfig = {
  // The base URL for all backend API services
  LAMASSU_API: 'https://lab.lamassu.io/api',

  // The OIDC authority URL for authentication
  LAMASSU_AUTH_AUTHORITY: 'https://lab.lamassu.io/auth/realms/lamassu',
  
  // The OIDC client ID for this frontend application
  LAMASSU_AUTH_CLIENT_ID: 'frontend'

  
};
