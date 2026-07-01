/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The web app talks only to the Gabriel Gateway (BFF). During local dev the
  // gateway base URL is provided via NEXT_PUBLIC_GATEWAY_URL; in production the
  // desktop shell / deployment injects it.
  env: {
    NEXT_PUBLIC_GATEWAY_URL:
      process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080',
  },
};

export default nextConfig;
