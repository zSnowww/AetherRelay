/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Next 16's CLI checker can truncate `--showConfig` output under Node 24.
  // TypeScript 5 keeps its compiler API, so use it for deterministic desktop builds.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
