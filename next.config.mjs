/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // PDF converter uses native @napi-rs/canvas; must run in Node, not be bundled by webpack
    serverComponentsExternalPackages: ["pdf-to-png-converter", "@napi-rs/canvas"],
  },
};

export default nextConfig;
