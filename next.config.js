/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Domains for external images (legacy, use remotePatterns for new configs)
    domains: [
      'images.unsplash.com',
      'source.unsplash.com',
      'maps.googleapis.com',
      'upload.wikimedia.org',
    ],
    // Modern pattern-based remote image configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'photos.hotelbeds.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
        pathname: '/**',
      },
    ],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for fixed-width images
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow data URIs for placeholder images
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
