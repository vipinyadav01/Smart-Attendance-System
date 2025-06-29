const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true
});

module.exports = withPWA({
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["cloudinary"],
  },
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
