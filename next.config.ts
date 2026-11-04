import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
    ],
  },
  outputFileTracingIncludes: {
    "/comics/[id]": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/comics": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/equity/[id]": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/equity": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/equities": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/market": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/watchlist": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/sniper": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json"],
    "/assets/**/*": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json", "./data/universe/character-footprints.json"],
    "/api/**/*": ["./data/pp115k.sqlite", "./data/gcd_variant_map.json", "./data/universe/character-footprints.json"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vbcmjmakluyjnsmisoth.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.gcd.org",
      },
      {
        protocol: "http",
        hostname: "**.gcd.org",
      },
      {
        protocol: "https",
        hostname: "**.comics.org",
      },
      {
        protocol: "https",
        hostname: "static.wikia.nocookie.net",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
      {
        protocol: "https",
        hostname: "cdn.marvel.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/images.pricecharting.com/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/panel-profits-covers-all/**",
      },
      {
        protocol: "https",
        hostname: "**.ebayimg.com",
      },
    ],
  },
  async headers() {
    // HTML page rules (/, /market, /equities, /comics/:id) were removed on purpose: those pages show
    // the signed-in visitor's name, diary and collection, so a shared CDN copy could leak one
    // person's view to another. Only truly static files get long public caching here.
    return [
      {
        source: "/covers/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/surface-art/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
