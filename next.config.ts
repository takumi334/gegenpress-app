/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScriptのビルドエラーがあってもビルドを通す
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLintのエラーがあってもビルドを通す
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
