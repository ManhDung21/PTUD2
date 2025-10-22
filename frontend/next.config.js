/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "your backend-domains",
        port: "8000",
        pathname: "/static/**",
      },
    ],
  },
};

module.exports = nextConfig;
