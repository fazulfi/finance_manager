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
};

module.exports = nextConfig;
