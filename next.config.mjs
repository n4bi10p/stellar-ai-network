/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow mobile device access during development
  // Replace 192.168.0.104 with your actual mobile device IP
  turbopack: {
    root: './',
  },
  // Dev origins configuration for mobile testing
  experimental: {
    allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.0.104'],
  },
};

export default nextConfig;
