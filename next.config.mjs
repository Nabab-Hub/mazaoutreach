/** @type {import('next').NextConfig} */
// Enable cross-platform SWC WebAssembly bindings on Node 26+ environments
if (typeof process !== 'undefined' && process.versions) {
  // @ts-ignore
  process.versions.webcontainer = '1';
}

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
