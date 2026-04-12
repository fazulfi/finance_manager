/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@finance/ui",
    "@finance/types",
    "@finance/utils",
    "@finance/api",
    "@finance/db",
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      ".js": [".ts", ".tsx", ".js"],
    };

    return config;
  },
};

module.exports = nextConfig;
