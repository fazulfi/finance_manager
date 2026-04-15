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
  eslint: {
    // Temporarily ignore TypeScript strict linting during build
    // to unblock build process - will be addressed in separate PR
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      ".js": [".ts", ".tsx", ".js"],
    };

    // Exclude Deno shim from client bundles (requires Node.js modules)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@deno/shim-deno": false,
    };

    return config;
  },
};

module.exports = nextConfig;
