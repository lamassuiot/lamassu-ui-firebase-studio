# LamassuIoT

LamassuIoT is a modern infrastructure for managing X.509 certificates and Public Key Infrastructure (PKI). It provides a user-friendly interface for issuing, inspecting, and verifying certificates, ensuring the security and integrity of your IoT ecosystem.

## Core Features

-   **CA Management**: Create, import, and manage the lifecycle of Certificate Authorities.
-   **RA Management**: Configure Registration Authorities supporting the EST protocol for device enrollment.
-   **Certificate Management**: Issue, inspect, and revoke end-entity certificates.
-   **VA via OCSP and CRL**: Provide certificate validation services through OCSP and Certificate Revocation Lists.
-   **Device Identity Management**: Manage the lifecycle of IoT device identities and their associated certificates.

## Tech Stack

This project is built with a modern, performant, and type-safe technology stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **UI Library**: [React](https://react.dev/)
-   **Component Library**: [ShadCN UI](https://ui.shadcn.com/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Authentication**: [OIDC Client](https://github.com/authts/oidc-client-ts) for OpenID Connect integration.
-   **Cryptography**: [PKI.js](https://pkijs.org/) and [ASN1.js](https://github.com/PeculiarVentures/ASN1.js) for certificate parsing and manipulation.


## Getting Started

Follow these steps to get the development environment running.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 20 or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd lamassuiot-pki-dashboard
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

To start the development server, run the following command:

```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002).

## Configuration

The application can be configured at runtime by creating and modifying a `public/config.js` file. This file allows you to customize the application's behavior without needing to rebuild it.

Create a `config.js` file inside the `public/` directory with the following structure:

```javascript
window.lamassuConfig = {
  // The base URL for all backend API services.
  LAMASSU_API: "https://your-api-endpoint.example.com",

  // --- Authentication ---
  // Set to `false` to disable OIDC authentication for local development.
  // Defaults to `true`.
  LAMASSU_AUTH_ENABLED: true,

  // The URL of your OpenID Connect (OIDC) identity provider.
  // Required if LAMASSU_AUTH_ENABLED is true.
  LAMASSU_AUTH_AUTHORITY: "https://your-oidc-provider.example.com/auth/realms/my-realm",

  // The client ID for the frontend application registered with your OIDC provider.
  // Defaults to "frontend".
  LAMASSU_AUTH_CLIENT_ID: "frontend-client-id",

  // --- Integrations ---
  // An array of strings defining available platform connectors for integrations.
  LAMASSU_CONNECTORS: ["aws.us-east-1.123456789012"],

  // --- UI Customization ---
  // Set to `true` to enable a custom HTML footer loaded from `public/footer.html`.
  // Defaults to `false`.
  LAMASSU_FOOTER_ENABLED: false
};
```

## Available Scripts

-   `npm run dev`: Starts the application in development mode with hot-reloading.
-   `npm run build`: Creates an optimized production build of the application.
-   `npm run start`: Starts a production server for the built application.
-   `npm run lint`: Runs ESLint to identify and report on patterns in the code.
-   `npm run fix`: Runs ESLint and automatically fixes fixable issues.
-   `npm run typecheck`: Runs the TypeScript compiler to check for type errors.

## License

This project is licensed under the Mozilla Public License 2.0 (MPL 2.0). See the `LICENSE` file for more details.
