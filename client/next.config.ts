import type { NextConfig } from "next";

const API_URL =
  process.env.NODE_ENV === "production"
    ? process.env.WORKER_URL ?? "https://server.saradhi8142385201.workers.dev"
    : "http://localhost:8787";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
