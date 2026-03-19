/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScriptのビルドエラーがあってもビルドを通す
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
