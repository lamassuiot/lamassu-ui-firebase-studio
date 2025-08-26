# LamassuIoT

LamassuIoT is a modern, web-based dashboard for managing X.509 certificates and Public Key Infrastructure (PKI). It provides a user-friendly interface for importing, inspecting, and verifying certificates, ensuring the security and integrity of your IoT ecosystem.

## Core Features

-   **Certificate Management**: Import existing X.509 certificates in PEM, CRT, or CER formats.
-   **In-Depth Inspection**: View detailed certificate information, including Subject, Issuer, validity period, and Subject Alternative Names (SANs).
-   **Chain Verification**: Verify the entire certificate chain up to a trusted root CA.
-   **Dashboard UI**: A clean, dashboard-style interface with minimalistic controls for all key actions.
-   **CA & Device Management**: Manage Certificate Authorities and IoT device identities within your PKI.

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

## Available Scripts

-   `npm run dev`: Starts the application in development mode with hot-reloading.
-   `npm run build`: Creates an optimized production build of the application.
-   `npm run start`: Starts a production server for the built application.
-   `npm run lint`: Runs ESLint to identify and report on patterns in the code.
-   `npm run fix`: Runs ESLint and automatically fixes fixable issues.
-   `npm run typecheck`: Runs the TypeScript compiler to check for type errors.

## License

This project is licensed under the terms of the license specified in the `LICENSE` file.

