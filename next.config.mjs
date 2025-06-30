const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Fix workbox watch mode issues
  disable: process.env.NODE_ENV === 'development',
  // Workbox options
  workboxOptions: {
    swDest: 'public/sw.js',
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cloudinary-images-cache',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /\.(?:js|css|woff2?|eot|ttf|otf)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
    ],
  },
});

module.exports = withPWA({
  reactStrictMode: true,
  serverExternalPackages: ["cloudinary"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        querystring: false,
      };

      config.externals = config.externals || [];
      config.externals.push({
        cloudinary: "commonjs cloudinary",
      });
    }

    return config;
  },
  images: {
    domains: ["res.cloudinary.com", "lh3.googleusercontent.com"],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["recharts"],

  
});
