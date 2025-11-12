import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'react-big-calendar',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@tanstack/react-query',
    ],
  },
  // Turbopack configuration (when using --turbo flag)
  // Turbopack is zero-configuration by default
  // This config is defined to satisfy the warning about webpack being configured
  // Turbopack automatically handles CSS, source maps, and module resolution
  turbopack: {
    // Turbopack handles everything automatically - no additional config needed
    // The webpack config above is only used when NOT using Turbopack
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Webpack config (only used when NOT using Turbopack)
  webpack: (config, { isServer, dev }) => {
    // Suppress warnings about outdated JSX transform from dependencies
    config.ignoreWarnings = [
      {
        module: /node_modules/,
        message: /outdated JSX transform/i,
      },
    ];

    // Disable CSS source maps to prevent 404 errors for CSS files
    // from packages like react-big-calendar that don't include source maps
    if (!isServer) {
      // Recursively find and modify CSS loader options
      const modifyCssLoader = (rules: any[]): void => {
        rules.forEach((rule) => {
          if (rule.oneOf && Array.isArray(rule.oneOf)) {
            modifyCssLoader(rule.oneOf);
          }
          
          if (rule.use) {
            const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
            uses.forEach((use: any) => {
              if (
                typeof use === 'object' &&
                use !== null &&
                use.loader &&
                typeof use.loader === 'string' &&
                use.loader.includes('css-loader')
              ) {
                if (!use.options) {
                  use.options = {};
                }
                use.options.sourceMap = false;
              }
            });
          }
          
          if (rule.rules && Array.isArray(rule.rules)) {
            modifyCssLoader(rule.rules);
          }
        });
      };

      if (config.module && config.module.rules) {
        modifyCssLoader(config.module.rules);
      }
    }

    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  reactStrictMode: true,
  // Disable source maps in production
  productionBrowserSourceMaps: false,
};

export default nextConfig;
