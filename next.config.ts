import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.0.0",
  },
  // three.js ships ESM examples that benefit from being transpiled by the bundler.
  transpilePackages: ["three"],
};

export default nextConfig;
