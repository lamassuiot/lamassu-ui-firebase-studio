// This file can be used to override the default configuration of the application.
// You can change the values of the following variables to customize the application.
// Any variables you don't want to override can be removed from this file.

window.lamassuConfig = {
    // Auth Settings
    LAMASSU_AUTH_ENABLED: true, // Set to false to disable authentication for local development
    LAMASSU_AUTH_AUTHORITY: "http://localhost:8080/realms/lamassu", // OIDC provider URL
    LAMASSU_AUTH_CLIENT_ID: "frontend", // OIDC client ID
    // Note: Do not add client secret here. This is a public client.

    // API Endpoint Settings
    LAMASSU_API: "http://localhost:8090/api", // Base URL for all backend APIs

    // Customization Settings
    LAMASSU_FOOTER_ENABLED: false, // Set to true to show a custom footer loaded from /public/footer.html
    LAMASSU_SECONDARY_LOGO_ENABLED: true, // Set to true to show a secondary logo in the top bar
    LAMASSU_SECONDARY_LOGO: '', // URL for the secondary logo, e.g. '/my-logo.svg'. Must be in the /public folder. If empty, a placeholder is shown.

    // Comma-separated list of enabled connectors
    LAMASSU_CONNECTORS: "aws.us-east-1.12345,aws.us-west-2.67890",
};
