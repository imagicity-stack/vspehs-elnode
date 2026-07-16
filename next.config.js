/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tree-shake barrel exports so webpack only compiles the icons/helpers we
  // actually import instead of the whole package — keeps the build compile
  // phase (the long silent stretch on Vercel) as small as possible.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
