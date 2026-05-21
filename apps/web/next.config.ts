import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import type { NextConfig } from 'next'

const monorepoRoot = path.resolve(__dirname, '../..')
loadEnv({ path: path.join(monorepoRoot, '.env') })
loadEnv({ path: path.join(monorepoRoot, '.env.local'), override: true })

const nextConfig: NextConfig = {
  transpilePackages: ['@relay/db'],
}

export default nextConfig
