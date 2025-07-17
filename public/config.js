window.lamassuConfig = {
    // Flag to enable or disable OIDC authentication.
    // Set to false to use a mock user for development without a Keycloak instance.
    LAMASSU_AUTH_ENABLED: true,

    // OIDC provider details
    //LAMASSU_AUTH_AUTHORITY: "https://lab.lamassu.io/auth/realms/lamassu",
    LAMASSU_AUTH_AUTHORITY: "https://sandbox.lamassu.io/auth/realms/lamassu",
    LAMASSU_AUTH_CLIENT_ID: "frontend",

    // Base URL for the Lamassu API gateway
    //LAMASSU_API: "https://lab.lamassu.io/api",
    LAMASSU_API: "https://sandbox.lamassu.io/api",

    // Flag to enable a custom footer from public/footer.html
    LAMASSU_FOOTER_ENABLED: false,

    LAMASSU_CONNECTORS: [ 'aws.iot-core','aws.iot.eu-west-1.123456789012']
};
