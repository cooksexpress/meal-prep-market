// next.config.js
//
// Cook photos live in Supabase Storage, so next/image must be allowed
// to load them. Without this, every cook photo shows as a broken image.

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
