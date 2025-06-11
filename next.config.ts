
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Provide fallbacks for Node.js built-in modules that some
    // server-side libraries might try to use in a way Webpack doesn't
    // handle by default when bundling for client/server.
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback.fs = false;
    config.resolve.fallback.path = false;
    config.resolve.fallback.net = false;
    config.resolve.fallback.tls = false;

    // The 'require.extensions' error from Handlebars (often via dotprompt/Genkit)
    // is best fixed by patching 'handlebars' using 'patch-package'.
    // Your project already has 'patch-package' in its dependencies and a
    // 'postinstall' script, which is excellent.
    // If the error persists, ensure you have a patch file like
    // 'patches/handlebars+<version>.patch' that comments out or removes
    // the lines in 'node_modules/handlebars/lib/index.js' (or similar file)
    // that attempt to use 'require.extensions['.hbs'] = ...;'.
    // Example:
    // try {
    //   // require.extensions['.hbs'] = function(module, filename) { .. }; // This block should be commented out
    // } catch (err) { /* NOP */ }

    return config;
  },
};

export default nextConfig;
