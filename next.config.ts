/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 蝙九お繝ｩ繝ｼ縺後≠縺｣縺ｦ繧よ悽逡ｪ繝薙Ν繝峨ｒ騾壹☆
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint繧ｨ繝ｩ繝ｼ縺後≠縺｣縺ｦ繧よ悽逡ｪ繝薙Ν繝峨ｒ騾壹☆
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

