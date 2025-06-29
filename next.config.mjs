const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["cloudinary"],
  },
  webpack: (config, { isServer }) => {
    // Handle Cloudinary on client side
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
      }

      // Exclude server-only packages from client bundle
      config.externals = config.externals || []
      config.externals.push({
        cloudinary: "commonjs cloudinary",
      })
    }

    // Handle recharts SSR issues
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/recharts/,
      use: {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env", "@babel/preset-react"],
          plugins: ["@babel/plugin-transform-modules-commonjs"],
        },
      },
    })

    return config
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
