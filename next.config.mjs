/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 이 옵션이 필수입니다!
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig