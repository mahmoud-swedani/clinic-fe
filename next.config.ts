import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
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
