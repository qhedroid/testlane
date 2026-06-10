import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import type { NextConfig } from 'next'

const monorepoRoot = path.resolve(__dirname, '../..')
loadEnv({ path: path.join(monorepoRoot, '.env') })
loadEnv({ path: path.join(monorepoRoot, '.env.local'), override: true })

// Static export for here.now demo publish — see docs/deployment/here-now.md
const nextConfig: NextConfig = {
  transpilePackages: ['@relay/db'],
  output: process.env.RELAY_STATIC_EXPORT === '1' ? 'export' : undefined,
  images: { unoptimized: true },
}

export default nextConfig
