import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@reelrank/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
