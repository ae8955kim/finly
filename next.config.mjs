/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/manage', // GitHub Pages 서브경로(리포지토리 이름) 지정
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig