import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.219.118",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.219.118:3000",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
